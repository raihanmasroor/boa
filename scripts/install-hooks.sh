#!/usr/bin/env bash
#
# install-hooks.sh - install the repo's tracked git hooks into this clone.
#
# git does not version-control .git/hooks/, so hooks are kept under
# scripts/hooks/ (tracked) and copied into place by this script. Idempotent;
# run it once after cloning to enable the auto-deploy-on-main-commit hook
# (scripts/hooks/post-commit backgrounds scripts/boa-deploy.sh on `main`).
#
# Usage: scripts/install-hooks.sh
set -euo pipefail

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$REPO_DIR/scripts/hooks"
# `--git-path hooks` resolves the real hooks dir (handles worktrees / custom
# core.hooksPath / a $GIT_DIR that is not `.git`).
DST="$(git -C "$REPO_DIR" rev-parse --git-path hooks)"
case "$DST" in /*) ;; *) DST="$REPO_DIR/$DST" ;; esac

if [ ! -d "$SRC" ]; then
  echo "no tracked hooks at $SRC; nothing to install" >&2
  exit 0
fi

mkdir -p "$DST"
installed=0
for hook in "$SRC"/*; do
  [ -f "$hook" ] || continue
  name="$(basename "$hook")"
  cp "$hook" "$DST/$name"
  chmod +x "$DST/$name"
  echo "installed hook: $name -> $DST/$name"
  installed=$((installed + 1))
done
echo "$installed hook(s) installed."
