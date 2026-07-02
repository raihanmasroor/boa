# tmux Status Bar

Band of Agents can display session information in your tmux status bar, showing:
- **Session title**: The name of your BOA session
- **Git branch**: For worktree sessions
- **Container name**: For sandboxed (Docker) sessions

## How It Works

When you start a session, BOA configures the tmux status bar to display this information in your active theme's colors (Empire by default).

**Example status bars:**
```
boa: My Session | 14:30                           # Basic session
boa: My Session | feature-branch | 14:30          # Worktree session
boa: My Session ⬡ aoe-sandbox-a1b2c3d4 | 14:30     # Sandboxed session
boa: My Session | main ⬡ aoe-sandbox-a1b2c3d4 | 14:30  # Worktree + sandbox
```

## Auto Mode (Default)

By default, BOA uses "auto" mode for the status bar:

- **If you don't have a `~/.tmux.conf`**: BOA automatically styles the status bar for BOA sessions
- **If you have a `~/.tmux.conf`**: BOA assumes you prefer your own configuration and does not modify the status bar

This ensures beginners get a helpful status bar out of the box, while experienced tmux users retain full control.

## Configuration

Configure the status bar behavior in `~/.agent-of-empires/config.toml`:

```toml
[tmux]
# "auto" (default) - Apply only if no ~/.tmux.conf exists
# "enabled"        - Always apply boa status bar styling
# "disabled"       - Never apply, use your own tmux config
status_bar = "auto"
mouse = "auto"     # Same modes: auto, enabled, disabled
clipboard = "auto" # Same modes: auto, enabled, disabled
```

### Values

| Value | Description |
|-------|-------------|
| `auto` | Apply status bar if user has no tmux config (default) |
| `enabled` | Always apply BOA status bar to BOA sessions |
| `disabled` | Never modify tmux status bar |

## Clipboard Pass-through

TUI agents copy to the system clipboard via OSC 52 escape sequences, which tmux swallows by default, so "select to copy" inside the agent silently fails. With clipboard pass-through (the default in `auto` mode when you have no `~/.tmux.conf`), BOA lets those sequences reach your terminal emulator.

Set `clipboard = "disabled"` if you don't trust the wrapped agent's terminal output (pass-through lets the inner program write arbitrary escape sequences to your outer terminal).

If you manage your own `~/.tmux.conf`, set these yourself:

```tmux
set -g set-clipboard on
set -g allow-passthrough on
```

Some terminal emulators also need clipboard write permission enabled (Ghostty's `clipboard-write = allow`, etc.).

## Custom Integration

If you have your own tmux configuration but want to display BOA session info, use the `boa tmux status` command.

### Basic Integration

Add this to your `~/.tmux.conf`:

```tmux
set -g status-right "#(boa tmux status) | %H:%M"
```

This will show the BOA session title and branch when attached to a BOA session, and nothing when in other tmux sessions.

### JSON Output

For more advanced scripting:

```bash
boa tmux status --format json
```

Output:
```json
{"title": "My Session", "branch": "feature-branch", "sandbox": null}
```

For a sandboxed session:
```json
{"title": "My Session", "branch": null, "sandbox": "aoe-sandbox-a1b2c3d4"}
```

Returns `null` if not in a BOA session.

### Example: Conditional Display

```tmux
# Only show boa info if in a boa session
set -g status-right "#{?#{==:#(boa tmux status),},,%#(boa tmux status) | }%H:%M"
```

## tmux User Options

BOA sets `@aoe_title`, `@aoe_branch` (worktree sessions), and `@aoe_sandbox` (sandboxed sessions) on each session, which you can reference in your own config:

```tmux
set -g status-right "#{@aoe_title} #{@aoe_branch} #{@aoe_sandbox} | %H:%M"
```

## Troubleshooting

### Status bar not showing

1. Check if you have a `~/.tmux.conf` or `~/.config/tmux/tmux.conf`
2. If so, either:
   - Set `status_bar = "enabled"` in your BOA config
   - Or add `boa tmux status` to your tmux.conf manually

### Status bar shows old info

The tmux user options are set when the session starts. If you rename a session in BOA, the status bar will show the old name until you restart the session.

### Branch not showing

Branch is only displayed for worktree sessions (sessions created with `boa add --worktree`). Regular sessions don't have a fixed branch.

### Container not showing

Container name is only displayed for sandboxed sessions (sessions created with `boa add --sandbox`). The container name follows the pattern `aoe-sandbox-<session_id_first_8_chars>`.
