# BOA — Band of Agents

Raihan's fork of [agent-of-empires](https://github.com/agent-of-empires/agent-of-empires)
(MIT). BOA is the console for running a *band* of Claude Code agents across two
Claude accounts, with a conductor that decomposes goals into parallel workers.

## Fork strategy

- `origin` = this repo (`raihanmasroor/boa`), `upstream` = agent-of-empires.
- Upstream ships fast (100+ releases). **Customize via config, launchers, the
  HTTP API, and sidecars first; patch core only when unavoidable** — every core
  patch is future merge debt. Sync regularly:
  `git fetch upstream && git merge upstream/main`.

## Where things live (verified against v1.12 source)

| Area | Path | Language |
|---|---|---|
| Core (sessions, tmux, worktrees, TUI, serve) | `src/` | Rust |
| Web dashboard | `web/` | TypeScript |
| ACP structured-view workers | `acp-worker/` | Node/TS |
| Plugin API + bundled plugins | `aoe-plugin-api/`, `plugins/` | Rust (external plugin *execution* not wired up yet — see docs/plugins.md) |
| Themes | `themes/` | config |
| HTTP API docs | `docs/api.md` | — |

## Customization roadmap (Raihan OS parity)

### P0 — Dual Claude accounts (config only, no code)
Custom launchers are first-class (docs/features.md: "Wrap any agent in a custom
script… injecting environment variables… per profile or repo"). Already proven
on this machine:
- `~/.local/bin/claude-personal` → `CLAUDE_CONFIG_DIR=$HOME/.claude-personal exec claude "$@"`
- `~/.local/bin/claude-ydo` → `CLAUDE_CONFIG_DIR=$HOME/.claude-ydo exec claude "$@"`
- Sessions: `aoe add --title x --cmd-override ~/.local/bin/claude-ydo --launch`
- TODO: account color-coding in the dashboard session list (`web/`, TS).

### P1 — Conductor (sidecar via the HTTP API, no Rust)
`aoe serve` exposes an orchestration API (docs/api.md): token-authed
`POST /api/sessions/{id}/send` + session CRUD, explicitly intended for
"external orchestrators". Port from agentic-os `command-centre`:
- `src/lib/raihan-os/decompose.ts` — goal → JobSpec[] via `claude -p`
  (heuristic fallback). Reuse nearly as-is.
- `createRun` fan-out → replace tmux exec with BOA API calls
  (create session per job with the per-account launcher, send seed prompt).
- Surface: either a small "conductor" web page in `web/` or a goal box added to
  the dashboard; v0 can be a CLI (`boa-conduct "<goal>"`).

### P2 — Team mailbox (port; nothing upstream has this)
`command-centre/src/lib/raihan-os/mailbox.ts` (DM/broadcast/blackboard between
workers of a run). File-based; works alongside any console. Wire send/read into
seeded worker prompts as in Raihan OS.

### P3 — Approvals with scopes
Upstream has swipe-to-approve + `aoe acp approve --always|--deny`. Evaluate
whether that covers just-once/allow-run semantics from Raihan OS approvals
before porting anything.

### P4 — Identity
Rebrand surfaces (dashboard title/theme in `web/` + `themes/`) — NOT the
binary/crate names (mass-rename = permanent merge conflicts with upstream).

## Dev commands
- Build: `cargo build --release` (binary at `target/release/aoe`)
- Web dashboard dev: see `web/` package.json
- Run TUI: `./target/release/aoe` · Serve: `aoe serve --daemon --host 0.0.0.0 --port 8080`
- Their contributor docs: `DESIGN.md`, `docs/development.md`, `CONTRIBUTING.md`
  (repo ships its own `CLAUDE.md`/`AGENTS.md` — Claude Code-friendly).

## Live trial state (2026-07-02)
Homebrew `aoe` 1.12.0 running on the Mac mini next to Raihan OS:
dashboard `http://100.96.50.31:8080` (token auth), sessions `personal-demo` +
`ydo-demo` proving the dual-account launcher trick.
