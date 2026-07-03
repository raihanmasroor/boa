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

## BOA divergences from upstream (core patches)

Core patches carry merge debt, so each one is listed here with its blast radius.

### Auto-provision ACP adapters at `aoe serve` startup
**Why:** upstream ships the structured (ACP) view but leaves adapter install to
the user — on a fresh box `claude-agent-acp`, `codex-acp`, and the `gemini` CLI
are each missing until someone hand-runs `npm install -g …` (or `aoe acp doctor
--fix`, or the dashboard's "Update & restart"). So every ACP agent renders a
"binary not found" error out of the box.

**What:** at daemon startup BOA probes PATH for each adapter and, for any that is
missing and has an `npm_package_for` mapping, runs `npm install -g <pkg>` once,
serialized, in a background task. It never blocks the HTTP listener, is
best-effort (failures fall back to the existing manual install hints), skips
gracefully when npm is absent, and is skipped in read-only mode.

**Touched (small + surgical):**
- `src/acp/auto_provision.rs` — **new** module (provision logic + injected-closure unit tests + fake-npm smoke).
- `src/acp/mod.rs` — register `pub mod auto_provision;`.
- `src/session/config.rs` — new `acp.auto_install_adapters` toggle (default **true**; same `SettingsSection` pattern as `allow_agent_install`).
- `src/server/mod.rs` — one background `spawn_supervised` block in `start_server`, gated on the flag and `!read_only`.

Provision list: `["claude-agent-acp", "codex-acp", "gemini"]`. Reuses
`install_hints::npm_package_for` (the same npm-only table behind the doctor's
`--fix` and the web install action), so there is one source of truth for which
adapters are npm-installable. Disable with `acp.auto_install_adapters = false`.

### `--remote-control` on interactive Claude sessions
**Why:** upstream launches plain `claude` for terminal sessions, so a
BOA-spawned Claude Code session never registers with Claude Desktop /
claude.ai remote control and is invisible there. We want every interactive
Claude session BOA starts — `add --cmd claude`, the TUI new-session flow, the
web wizard, and resume/fork/restart relaunches — to appear in remote control.

**What:** claude's `AgentDef` carries a new `remote_control_flag:
Some("--remote-control")`; every other agent is `None`. A small helper
(`apply_remote_control_flag`) appends it in the same three interactive command
builders where the yolo flag is applied (sandboxed, host default, host
override), immediately before the resume/fork flags so it survives `--resume
<id>` reconstruction. It is scoped to interactive terminal launches by
construction: print/oneshot mode (`claude -p`, smart-rename / status probes)
builds its argv in a separate function (`smart_rename::build_oneshot_argv`) and
the ACP adapter path spawns separately, so neither receives the flag. Gated on
`session.claude_remote_control` (default **true**; same `SettingsSection`
pattern as `auto_resume_on_restart`); set it false to launch plain `claude`.

**Touched (small + surgical):**
- `src/agents.rs` — new `AgentDef::remote_control_flag` field (`Some` only for
  claude) + a surface-lock test (`test_only_claude_has_remote_control_flag`).
- `src/session/config.rs` — new `session.claude_remote_control` toggle (default
  **true**).
- `src/session/instance.rs` — `apply_remote_control_flag` helper +
  `remote_control_enabled()` resolver, applied at the three interactive builder
  sites; builder tests (fresh / resume-survives / other-agent / toggle-off).
- `src/session/smart_rename.rs` — regression test that print-mode argv omits the
  flag.

**Blast radius:** low. One additive optional field on `AgentDef` (all existing
literals set `None`, claude `Some`), one additive config toggle, and three
one-line helper calls next to the existing yolo application. No change to
resume/fork token insertion, the ACP path, or print-mode argv. Merge risk is a
literal-init conflict if upstream adds an agent or reorders `AgentDef` fields —
resolved by adding `remote_control_flag: None` to the new/edited literal.

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
