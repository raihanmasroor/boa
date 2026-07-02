<p align="center">
  <img src="assets/logo.png" alt="Band of Agents" width="128">
  <h1 align="center">Band of Agents (BOA)</h1>
  <p align="center"><sub>Internal session console for running a band of AI coding agents.</sub></p>
</p>

A session manager for AI coding agents on Linux and macOS, driven from the terminal (TUI) or any browser (web dashboard). Run many agents in parallel across different branches, each in its own isolated session with optional Docker sandboxing. Keeping track of which agent is stuck, which is waiting on input, and which just made a mess of your working tree becomes a part-time job; BOA makes it a glance: one dashboard, one status column, git worktrees and sandboxes set up for you, and sessions that outlive your terminal, reachable from your laptop, phone, or tablet.

## Features

- **Multi-agent support**: Claude Code, OpenCode, Mistral Vibe, Codex CLI, Gemini CLI, Antigravity CLI, Cursor CLI, Copilot CLI, Pi.dev, Factory Droid, Hermes, Kiro CLI, and Qwen Code
- **TUI dashboard**: visual interface to create, monitor, and manage sessions
- **Web dashboard**: create, monitor, and control your agents from any browser, installable as a PWA
- **Structured view** (web dashboard default): mobile-first native rendering of agent state via the Agent Client Protocol, with plan panels, tool-call cards, and swipe-to-approve. Flip a session to the terminal view for raw tmux rendering
- **Out-of-the-box ACP adapters** (BOA): `claude-agent-acp`, `codex-acp`, and the `gemini` CLI auto-install at first `boa serve` — no manual `npm install` step (see [BOA.md](BOA.md))
- **CLI and HTTP API**: drive sessions from the command line or external orchestrators
- **Remote phone access**: press `R` in the TUI to expose the web dashboard over HTTPS with QR + passphrase auth, via Tailscale Funnel or Cloudflare Tunnel
- **Status detection**: see which agents are running, waiting for input, or idle
- **Git worktrees and multi-repo workspaces**: parallel agents across branches, or one session driving several git repositories
- **Docker sandboxing**: isolate agents in containers with shared auth volumes (Podman and Apple Containers also supported)
- **Diff view**: review git changes and edit files without leaving the TUI
- **Session resume**: persist and resume Claude conversations across reboots and upgrades
- **Sound and push notifications**: audible cues and browser/PWA push when an agent needs your attention
- **Profiles, repo config, and agent overrides**: per-project settings, hooks, and custom agent launchers (this is how BOA runs one profile per Claude account)

## How It Works

Each agent runs in its own [tmux](https://github.com/tmux/tmux/wiki) session, so your agents keep running when you close the TUI, disconnect SSH, or your terminal crashes. Reopen `boa` and everything is exactly where you left it.

The key tmux shortcut to know: **`Ctrl+b d`** detaches from a session and returns to the TUI.

## Installation

**Prerequisites:** [tmux](https://github.com/tmux/tmux/wiki) (required), Node.js 20+ (for the structured view / ACP adapters), [Docker](https://www.docker.com/) (optional, for sandboxing).

```bash
# Clone and build from source
git clone https://github.com/raihanmasroor/boa
cd boa
cargo build --release --features serve   # --features serve builds the web dashboard + auto-provision

# The binary lands at ./target/release/boa (also available as ./target/release/aoe)
```

## Quick Start

```bash
./target/release/boa                                   # Launch the TUI
./target/release/boa add --cmd claude                  # Create a session running Claude Code
./target/release/boa serve --daemon --host 0.0.0.0 --port 8080   # Web dashboard for phone/remote access
```

In the TUI, press `?` for help. The bottom information bar shows all available keybindings in context.

## Documentation

Docs live in this repo under [`docs/`](docs/):

- [Installation](docs/installation.md)
- [Quick Start](docs/quick-start.md)
- [Web Dashboard](docs/structured-view.md)
- [HTTP API Reference](docs/api.md)
- [Plugins](docs/plugins.md)
- [Push Notifications](docs/push-notifications.md)
- [Development](docs/development.md)

BOA-specific customization (dual Claude accounts, the conductor roadmap, and every divergence from upstream) is documented in [BOA.md](BOA.md).

## FAQ

### What happens when I close BOA?

Nothing. Sessions are tmux sessions running in the background. Open and close `boa` as often as you like. Sessions only get removed when you explicitly delete them.

### Can I use BOA over SSH?

Yes. BOA runs in your terminal and sessions persist across disconnects. Reconnect and `boa` finds every session still running.

### Does it work on Windows?

Only through WSL2. BOA depends on tmux and POSIX process handling, so native Windows is not supported.

### How is this different from just using tmux directly?

tmux gives you persistent sessions. BOA adds agent-aware status detection (running, waiting, idle, error), git worktree management, Docker sandboxing, a web dashboard, remote phone access, and a diff viewer, all wrapped around your existing tmux workflow. You can still `tmux attach` to any BOA session directly.

## Development

```bash
cargo check                          # Type-check
cargo test                           # Run tests
cargo fmt                            # Format
cargo clippy                         # Lint
cargo build --release --features serve   # Release build with the web dashboard

# Run from source
cargo run                                 # TUI
cargo run --features serve -- serve       # Web dashboard on :8081 (debug namespace)

# Logging (AOE_LOG_LEVEL is the canonical knob; kept for config compatibility)
AOE_LOG_LEVEL=debug cargo run
boa logs                                  # View the log with the best viewer available
```

See [`docs/development.md`](docs/development.md) for the full reference.

Debug builds use a parallel namespace so they don't collide with an installed release build: app data lives in `~/.agent-of-empires-dev`, tmux sessions are prefixed `aoe_dev_`, and `boa serve` defaults to port `8081`. Release builds are unchanged.

## License

MIT License — see [LICENSE](LICENSE) for details.
