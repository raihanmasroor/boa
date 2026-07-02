# Installation

## Prerequisites

- [tmux](https://github.com/tmux/tmux/wiki) (required)
- [Docker](https://www.docker.com/) (optional, for sandboxing agents in containers)
- [Node.js](https://nodejs.org/) (optional, only needed when building the web dashboard from source with `--features serve`)

## Install Band of Agents

### Quick Install (Recommended)

Run the install script:

```bash
curl -fsSL \
  https://raw.githubusercontent.com/agent-of-empires/agent-of-empires/main/scripts/install.sh \
  | bash
```

### Homebrew

```bash
brew install aoe
```

### Build from Source

```bash
git clone https://github.com/agent-of-empires/agent-of-empires
cd agent-of-empires
cargo build --release
```

The binary will be at `target/release/boa`.

To include the web dashboard (browser access):

```bash
cargo build --release --features serve
```

This requires Node.js and npm. The web frontend is built automatically during compilation.

## Verify Installation

```bash
boa --version
```

## Updating

```bash
boa update
```

The `boa update` command detects how BOA was installed (Homebrew, the curl install script, Nix, or Cargo) and dispatches to the right upgrade mechanism. For Nix and Cargo it prints the manual upgrade command instead of attempting an automatic update, since those cases need external tooling.

Inside the TUI, press `u` when the update bar is visible to run the same flow without leaving the app. Press `Ctrl+x` to dismiss the bar for the current session.

If you installed shell completions as a static file, regenerate it after an update so it picks up new commands and flags. See [Shell Completions](guides/shell-completions.md) for both the static and the always-fresh eval-on-startup setup.

## Uninstall

```bash
boa uninstall
```

Prompts to remove the binary, configuration (the app data dir), and tmux settings.
