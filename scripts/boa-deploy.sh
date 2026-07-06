#!/usr/bin/env bash
#
# boa-deploy.sh - rebuild + reinstall + restart the local `boa serve` daemon so
# the running dashboard picks up the latest code. The web dashboard auto-reloads
# itself via DashboardUpdateBanner once the new binary is serving.
#
# Fast by design: uses the `dev-release` profile (optimized, no LTO, ~1 min)
# instead of `--release` (LTO, several minutes), since this runs on every commit
# to main. dev-release shares the release namespace (same app dir, tmux prefix,
# port 8090), so it is a drop-in for the installed release binary.
#
# Idempotent and single-flight: if a deploy is already running, this marks the
# run "dirty" and exits; the running deploy loops and rebuilds the newer source,
# so a burst of commits collapses into the latest build.
#
# Called automatically by .git/hooks/post-commit on the `main` branch; safe to
# run by hand too:  scripts/boa-deploy.sh
set -uo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BIN_DIR="$HOME/.local/bin"
PORT="${BOA_PORT:-8090}"
HOST="${BOA_HOST:-127.0.0.1}"
LOG="/tmp/boa-deploy.log"
LOCK="/tmp/boa-deploy.lock"   # mkdir-based mutex (macOS has no `flock`)
DIRTY="/tmp/boa-deploy.dirty"

# App dir (release namespace) holding serve.pid / serve.token.
if [ "$(uname -s)" = "Linux" ]; then APP_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/agent-of-empires"
elif [ -n "${XDG_CONFIG_HOME:-}" ] && [ -d "$XDG_CONFIG_HOME/agent-of-empires" ]; then APP_DIR="$XDG_CONFIG_HOME/agent-of-empires"
else APP_DIR="$HOME/.agent-of-empires"; fi

# Hooks run with a bare PATH; make cargo findable.
[ -f "$HOME/.cargo/env" ] && . "$HOME/.cargo/env"

log() { printf '%s %s\n' "$(date +%H:%M:%S)" "$1" >>"$LOG"; }

mkdir -p "$BIN_DIR"
: >>"$LOG"

# Single-flight: another deploy is mid-build -> mark dirty so it rebuilds the
# newest source when it finishes, and bail.
if ! mkdir "$LOCK" 2>/dev/null; then
  touch "$DIRTY"
  log "deploy already running; marked dirty, exiting"
  exit 0
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

while : ; do
  rm -f "$DIRTY"
  log "building (dev-release)..."
  if ! ( cd "$REPO_DIR" && cargo build --profile dev-release --features serve ) >>"$LOG" 2>&1; then
    log "BUILD FAILED; leaving the running daemon untouched. See $LOG"
    exit 1
  fi

  cp "$REPO_DIR/target/dev-release/boa" "$BIN_DIR/boa"
  # Re-sign ad-hoc: copying a signed arm64 binary invalidates its signature, and
  # macOS SIGKILLs an invalidly-signed binary on launch (exit 137). Required.
  codesign --force --sign - "$BIN_DIR/boa" >>"$LOG" 2>&1 || log "codesign warned (continuing)"
  if ! "$BIN_DIR/boa" --version >>"$LOG" 2>&1; then
    log "installed binary won't run (signature?); NOT restarting"
    exit 1
  fi
  log "installed $("$BIN_DIR/boa" --version 2>/dev/null || echo '?')"

  # Keep the dashboard token stable: it is reused while serve.token's mtime is
  # < 24h old, so bumping it here means frequent deploys never rotate the URL.
  [ -f "$APP_DIR/serve.token" ] && touch "$APP_DIR/serve.token"

  # Restart WITHOUT `boa serve --stop`/`--status`: their liveness probe fails
  # through a --behind-proxy daemon and the stale-PID sweep would wipe
  # serve.pid/url and orphan it. Kill the recorded pid and relaunch instead.
  oldpid="$(cat "$APP_DIR/serve.pid" 2>/dev/null || true)"
  [ -z "$oldpid" ] && oldpid="$(pgrep -f "boa serve --daemon-child --port $PORT" 2>/dev/null | head -1)"
  launch="$(ps -o command= -p "${oldpid:-0}" 2>/dev/null | sed 's#.*/boa serve#serve#; s/--daemon-child/--daemon/')"
  launch="${launch:-serve --daemon --host $HOST --port $PORT --behind-proxy}"
  [ -n "$oldpid" ] && { log "stopping serve pid $oldpid"; kill "$oldpid" 2>/dev/null || true; }
  pkill -f "boa serve --daemon-child --port $PORT" 2>/dev/null || true
  sleep 2
  ( cd "$HOME" && "$BIN_DIR/boa" $launch ) >>"$LOG" 2>&1 || log "relaunch returned non-zero"
  sleep 2
  if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    log "serve restarted on :$PORT"
  else
    log "WARNING: :$PORT not listening after restart; check $LOG"
  fi

  # A commit landed while we were building -> rebuild the newer source.
  [ -f "$DIRTY" ] || break
  log "commit landed during build; rebuilding newest source"
done
log "deploy done"
