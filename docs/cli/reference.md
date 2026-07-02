# Command-Line Help for `boa`

This document contains the help content for the `boa` command-line program.

**Command Overview:**

* [`boa`↴](#boa)
* [`boa add`↴](#boa-add)
* [`boa agents`↴](#boa-agents)
* [`boa init`↴](#boa-init)
* [`boa list`↴](#boa-list)
* [`boa logs`↴](#boa-logs)
* [`boa log-level`↴](#boa-log-level)
* [`boa remove`↴](#boa-remove)
* [`boa send`↴](#boa-send)
* [`boa status`↴](#boa-status)
* [`boa killall`↴](#boa-killall)
* [`boa session`↴](#boa-session)
* [`boa session start`↴](#boa-session-start)
* [`boa session stop`↴](#boa-session-stop)
* [`boa session restart`↴](#boa-session-restart)
* [`boa session attach`↴](#boa-session-attach)
* [`boa session show`↴](#boa-session-show)
* [`boa session rename`↴](#boa-session-rename)
* [`boa session set-worktree-name`↴](#boa-session-set-worktree-name)
* [`boa session capture`↴](#boa-session-capture)
* [`boa session current`↴](#boa-session-current)
* [`boa session set-session-id`↴](#boa-session-set-session-id)
* [`boa session set-base`↴](#boa-session-set-base)
* [`boa session snooze`↴](#boa-session-snooze)
* [`boa session unsnooze`↴](#boa-session-unsnooze)
* [`boa session favorite`↴](#boa-session-favorite)
* [`boa session unfavorite`↴](#boa-session-unfavorite)
* [`boa session archive`↴](#boa-session-archive)
* [`boa session unarchive`↴](#boa-session-unarchive)
* [`boa session restore`↴](#boa-session-restore)
* [`boa session list-trash`↴](#boa-session-list-trash)
* [`boa session empty-trash`↴](#boa-session-empty-trash)
* [`boa group`↴](#boa-group)
* [`boa group list`↴](#boa-group-list)
* [`boa group create`↴](#boa-group-create)
* [`boa group delete`↴](#boa-group-delete)
* [`boa group move`↴](#boa-group-move)
* [`boa plugin`↴](#boa-plugin)
* [`boa plugin list`↴](#boa-plugin-list)
* [`boa plugin info`↴](#boa-plugin-info)
* [`boa plugin enable`↴](#boa-plugin-enable)
* [`boa plugin disable`↴](#boa-plugin-disable)
* [`boa plugin install`↴](#boa-plugin-install)
* [`boa plugin update`↴](#boa-plugin-update)
* [`boa plugin uninstall`↴](#boa-plugin-uninstall)
* [`boa plugin hash`↴](#boa-plugin-hash)
* [`boa plugin discover`↴](#boa-plugin-discover)
* [`boa plugin outdated`↴](#boa-plugin-outdated)
* [`boa profile`↴](#boa-profile)
* [`boa profile list`↴](#boa-profile-list)
* [`boa profile create`↴](#boa-profile-create)
* [`boa profile delete`↴](#boa-profile-delete)
* [`boa profile rename`↴](#boa-profile-rename)
* [`boa profile default`↴](#boa-profile-default)
* [`boa project`↴](#boa-project)
* [`boa project list`↴](#boa-project-list)
* [`boa project add`↴](#boa-project-add)
* [`boa project remove`↴](#boa-project-remove)
* [`boa worktree`↴](#boa-worktree)
* [`boa worktree list`↴](#boa-worktree-list)
* [`boa worktree info`↴](#boa-worktree-info)
* [`boa worktree cleanup`↴](#boa-worktree-cleanup)
* [`boa tmux`↴](#boa-tmux)
* [`boa tmux status`↴](#boa-tmux-status)
* [`boa sounds`↴](#boa-sounds)
* [`boa sounds install`↴](#boa-sounds-install)
* [`boa sounds list`↴](#boa-sounds-list)
* [`boa sounds test`↴](#boa-sounds-test)
* [`boa theme`↴](#boa-theme)
* [`boa theme list`↴](#boa-theme-list)
* [`boa theme export`↴](#boa-theme-export)
* [`boa theme dir`↴](#boa-theme-dir)
* [`boa settings`↴](#boa-settings)
* [`boa settings explain`↴](#boa-settings-explain)
* [`boa telemetry`↴](#boa-telemetry)
* [`boa telemetry status`↴](#boa-telemetry-status)
* [`boa telemetry enable`↴](#boa-telemetry-enable)
* [`boa telemetry disable`↴](#boa-telemetry-disable)
* [`boa telemetry reset-id`↴](#boa-telemetry-reset-id)
* [`boa mcp`↴](#boa-mcp)
* [`boa mcp list`↴](#boa-mcp-list)
* [`boa serve`↴](#boa-serve)
* [`boa url`↴](#boa-url)
* [`boa acp`↴](#boa-acp)
* [`boa acp doctor`↴](#boa-acp-doctor)
* [`boa acp agents`↴](#boa-acp-agents)
* [`boa acp ps`↴](#boa-acp-ps)
* [`boa acp stop`↴](#boa-acp-stop)
* [`boa acp kill`↴](#boa-acp-kill)
* [`boa acp logs`↴](#boa-acp-logs)
* [`boa acp restart`↴](#boa-acp-restart)
* [`boa acp history`↴](#boa-acp-history)
* [`boa acp status`↴](#boa-acp-status)
* [`boa acp prompt`↴](#boa-acp-prompt)
* [`boa acp approve`↴](#boa-acp-approve)
* [`boa acp cancel`↴](#boa-acp-cancel)
* [`boa acp tail`↴](#boa-acp-tail)
* [`boa acp attach`↴](#boa-acp-attach)
* [`boa acp switch-agent`↴](#boa-acp-switch-agent)
* [`boa uninstall`↴](#boa-uninstall)
* [`boa update`↴](#boa-update)
* [`boa completion`↴](#boa-completion)

## `boa`

Band of Agents (BOA) is a terminal session manager that uses tmux to help you manage and monitor AI coding agents like Claude Code and OpenCode.

Run without arguments to launch the TUI dashboard.

**Usage:** `boa [OPTIONS] [COMMAND]`

###### **Subcommands:**

* `add` — Add a new session
* `agents` — List supported agents and their install status
* `init` — Initialize .agent-of-empires/config.toml in a repository
* `list` — List all sessions
* `logs` — View the configured BOA log file with a pretty viewer
* `log-level` — Get or set the running daemon's log filter at runtime. Pass a bare level (debug/info/...) for the safe expansion, or `--filter <expr>` for raw EnvFilter syntax. `--get` prints the current filter. Changes are ephemeral and lost on daemon restart
* `remove` — Remove a session
* `send` — Send a message to a running agent session
* `status` — Show session status summary
* `killall` — Force-stop everything BOA is running: the serve daemon, all agent workers, and all BOA tmux sessions. Destructive and unprompted
* `session` — Manage session lifecycle (start, stop, attach, etc.)
* `group` — Manage groups for organizing sessions
* `plugin` — Manage plugins (list, info, enable, disable, install, update, uninstall)
* `profile` — Manage profiles (separate workspaces)
* `project` — Manage the project registry used by multi-repo session pickers
* `worktree` — Manage git worktrees for parallel development
* `tmux` — tmux integration utilities
* `sounds` — Manage sound effects for agent state transitions
* `theme` — Manage color themes (list, export, customize)
* `settings` — Inspect resolved settings and their provenance
* `telemetry` — Manage anonymous opt-in usage telemetry
* `mcp` — Inspect the effective MCP server set (provenance, conflicts, drift)
* `serve` — Start a web dashboard for remote session access
* `url` — Print the current dashboard URL of a running `boa serve` daemon
* `acp` — Manage the ACP structured-view workers (doctor, ps, logs, prompt, approve, ...)
* `uninstall` — Uninstall Band of Agents
* `update` — Update BOA to the latest release
* `completion` — Generate shell completions

###### **Options:**

* `-p`, `--profile <PROFILE>` — Profile to use (separate workspace with its own sessions)
* `--daemon-url <DAEMON_URL>` — Attach to a remote agent daemon instead of using the local session list. Equivalent to setting `AOE_DAEMON_URL`; pair with `AOE_DAEMON_TOKEN` for the bearer token. Only meaningful at the no-subcommand `boa` invocation (the TUI dashboard); ignored otherwise



## `boa add`

Add a new session

**Usage:** `boa add [OPTIONS] [PATH]`

###### **Arguments:**

* `<PATH>` — Project directory (defaults to current directory). Omit when using `--scratch`

###### **Options:**

* `-t`, `--title <TITLE>` — Session title (defaults to folder name)
* `-i`, `--interactive` — Prompt for the session name, mirroring the TUI `n` flow. Shows the generated default; press Enter to accept it. Ignored when --title is given. Requires an interactive terminal
* `-g`, `--group <GROUP>` — Group path (defaults to parent folder)
* `-c`, `--cmd <COMMAND>` — Command to run (e.g., 'claude' or any other supported agent)
* `--tool <TOOL>` — Named built-in or configured custom agent to run
* `-P`, `--parent <PARENT>` — Parent session (creates sub-session, inherits group)
* `--fork-from <FORK_FROM>` — Fork an existing session: resume its conversation context in a new, independent session that then diverges. Give the source session's id or title. Terminal fork; available for agents that support forking (claude, codex, opencode)
* `-l`, `--launch` — Launch the session immediately after creating
* `-w`, `--worktree <WORKTREE_BRANCH>` — Create session in a git worktree for the specified branch
* `-b`, `--new-branch` — Create a new branch (use with --worktree)
* `--base-branch <BASE_BRANCH>` — Branch to base the new worktree branch on (use with --new-branch). Defaults to the repository's default branch. Useful for stacking work on top of an in-flight PR branch, hot-fixing a release branch, or branching off a teammate's branch
* `-r`, `--repo <EXTRA_REPOS>` — Additional repositories for multi-repo workspace (use with --worktree)
* `--project <PROJECTS>` — Names of registered projects to include as extra repos (use with --worktree). Resolves against the union of global + profile project registries
* `--no-submodules` — Skip `git submodule update --init --recursive` after creating the worktree, overriding the `worktree.init_submodules` config (default true). Useful for repos with large or deeply nested submodule trees that you don't need inside the agent session
* `-s`, `--sandbox` — Run session in a container sandbox
* `--sandbox-image <SANDBOX_IMAGE>` — Custom container image for sandbox (implies --sandbox)
* `-y`, `--yolo` — Enable YOLO mode (skip permission prompts)
* `--trust-hooks` — Automatically trust this repository's hooks and project-local MCP servers without prompting
* `--extra-args <EXTRA_ARGS>` — Extra arguments to append after the agent binary
* `--cmd-override <CMD_OVERRIDE>` — Override the agent binary command
* `--structured-view` — Render this session in the structured view (ACP-based native rendering) instead of the default terminal view. `boa add` defaults to the terminal (raw tmux/PTY) so the CLI matches the TUI; pass this (or `--agent`) to opt into the structured rendering. Ignored for tools with no ACP adapter
* `--agent <AGENT>` — Pick a specific ACP agent for the structured view (e.g., aoe-agent, claude-code)
* `--model <MODEL>` — Override the model used by aoe-agent (e.g., claude-opus-4-7, gpt-5, gemini-2.5-pro). Forwarded to the agent at session start
* `--scratch` — Create the session in a fresh scratch directory under `<app_dir>/scratch/<id>/` instead of a project path. The directory is removed when the session is deleted (unless `boa rm` is given `--keep-scratch`). Mutually exclusive with worktree-related flags



## `boa agents`

List supported agents and their install status

**Usage:** `boa agents`



## `boa init`

Initialize .agent-of-empires/config.toml in a repository

**Usage:** `boa init [PATH]`

###### **Arguments:**

* `<PATH>` — Directory to initialize (defaults to current directory)

  Default value: `.`



## `boa list`

List all sessions

**Usage:** `boa list [OPTIONS]`

###### **Options:**

* `--json` — Output as JSON
* `--all` — List sessions from all profiles



## `boa logs`

View the configured BOA log file with a pretty viewer

**Usage:** `boa logs [OPTIONS]`

###### **Options:**

* `-f`, `--follow` — Live-tail the log
* `-n`, `--lines <N>` — Show only the last N lines (fallback viewers; lnav handles its own)
* `--no-pager` — Skip viewer detection; write plain log to stdout
* `--path` — Print the resolved log file path and exit (no viewing)



## `boa log-level`

Get or set the running daemon's log filter at runtime. Pass a bare level (debug/info/...) for the safe expansion, or `--filter <expr>` for raw EnvFilter syntax. `--get` prints the current filter. Changes are ephemeral and lost on daemon restart

**Usage:** `boa log-level [OPTIONS] [LEVEL]`

###### **Arguments:**

* `<LEVEL>` — Bare level (trace|debug|info|warn|error). Expands to all known target roots, avoiding the firehose of dependency logs you would get from `RUST_LOG=debug`

###### **Options:**

* `--filter <FILTER>` — Raw EnvFilter directive. Use this for per-target tuning, e.g. `--filter acp.protocol=trace,info`. Bare `--filter debug` is rejected; use the positional `level` form instead
* `--get` — Print the current filter without changing it



## `boa remove`

Remove a session

**Usage:** `boa remove [OPTIONS] <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title to remove

###### **Options:**

* `--delete-worktree` — Delete worktree directory (default: keep worktree)
* `--delete-branch` — Delete git branch after worktree removal (default: per config)
* `--force` — Force worktree removal even with untracked/modified files
* `--keep-container` — Keep container instead of deleting it (default: delete per config)
* `--keep-scratch` — For scratch sessions, keep the scratch directory on disk instead of removing it. The session record is still deleted; the kept path is logged so you can find the files later. No effect on non-scratch sessions
* `--purge` — Permanently delete instead of moving to trash. By default `rm` moves the session to the trash (when `session.delete_to_trash` is enabled, the default) so it can be restored; `--purge` forces the irreversible teardown (worktree/branch/container cleanup per the other flags, plus transcript removal)



## `boa send`

Send a message to a running agent session

**Usage:** `boa send [OPTIONS] <IDENTIFIER> <MESSAGE>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title
* `<MESSAGE>` — Message to send to the agent

###### **Options:**

* `--no-revive` — Fail loud on dead/stopped sessions instead of auto-respawning. Default behavior is to revive the session so a `send` after a crash or stop just works; pass this for scripts that want the previous bail-out



## `boa status`

Show session status summary

**Usage:** `boa status [OPTIONS]`

###### **Options:**

* `-v`, `--verbose` — Show detailed session list
* `-q`, `--quiet` — Only output waiting count (for scripts)
* `--json` — Output as JSON



## `boa killall`

Force-stop everything BOA is running: the serve daemon, all agent workers, and all BOA tmux sessions. Destructive and unprompted

**Usage:** `boa killall [OPTIONS]`

###### **Options:**

* `--timeout-secs <TIMEOUT_SECS>` — Grace period in seconds before force-killing agent workers. tmux sessions and the daemon use their own built-in grace

  Default value: `5`
* `--keep-daemon` — Leave the `boa serve` daemon running; stop only workers and tmux sessions



## `boa session`

Manage session lifecycle (start, stop, attach, etc.)

**Usage:** `boa session <COMMAND>`

###### **Subcommands:**

* `start` — Start a session's tmux process
* `stop` — Stop session process
* `restart` — Restart session (or all sessions with `--all`)
* `attach` — Attach to session interactively
* `show` — Show session details
* `rename` — Rename a session
* `set-worktree-name` — Edit a managed worktree session's workdir directory name (and, optionally, its git branch). Moves the worktree directory in place; the session must not be running. See #1723
* `capture` — Capture tmux pane output
* `current` — Auto-detect current session
* `set-session-id` — Set the resume target for a session (pin a conversation or force a one-shot fresh start)
* `set-base` — Set or clear the per-session diff base branch. The diff view compares the worktree against this ref instead of the auto-detected default. Useful when the PR target differs from the project default (stacked PRs, hotfix off `release/*`, renamed default branch). See #970
* `snooze` — Snooze a session for a duration (temporary archive, auto wakes)
* `unsnooze` — Wake a snoozed session immediately
* `favorite` — Mark a session as a favorite. Favorited rows pin to the top of their status tier in the Attention sort and render with a leading `* ` glyph plus bold + underline
* `unfavorite` — Clear the favorite flag on a session
* `archive` — Archive a session: sink it in the Attention sort and tear down its tmux sessions. Worktree, branch, container preserved. `--no-kill` skips tmux teardown. See #1868
* `unarchive` — Unarchive a session (restores it to its tier in the Attention sort)
* `restore` — Restore a trashed session, returning it to its prior bucket with its transcript and metadata intact. See #2489
* `list-trash` — List the sessions currently in the trash
* `empty-trash` — Permanently purge every trashed session in the profile (irreversible)



## `boa session start`

Start a session's tmux process

**Usage:** `boa session start <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title



## `boa session stop`

Stop session process

**Usage:** `boa session stop <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title



## `boa session restart`

Restart session (or all sessions with `--all`)

**Usage:** `boa session restart [OPTIONS] [IDENTIFIER]`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title (required unless `--all` is passed)

###### **Options:**

* `--all` — Restart every session in the active profile. Useful after `boa update`, after editing `sandbox.environment`, after a Docker hiccup, or after changing a hook. Mutually exclusive with `identifier`
* `--parallel <PARALLEL>` — Concurrency cap for `--all`. Restarting many sandboxed sessions in parallel pressures dockerd, so the default is intentionally modest. Ignored when `--all` is not set

  Default value: `3`



## `boa session attach`

Attach to session interactively

**Usage:** `boa session attach <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title



## `boa session show`

Show session details

**Usage:** `boa session show [OPTIONS] [IDENTIFIER]`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title (optional, auto-detects in tmux)

###### **Options:**

* `--json` — Output as JSON



## `boa session rename`

Rename a session

**Usage:** `boa session rename [OPTIONS] [IDENTIFIER]`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title (optional, auto-detects in tmux)

###### **Options:**

* `-t`, `--title <TITLE>` — New title for the session
* `-g`, `--group <GROUP>` — New group for the session (empty string to ungroup)
* `--rename-branch` — When the session is tied (session.tie_workdir_to_name) and an aoe-managed worktree, also rename the underlying git branch to match. Off by default; ignored for untied / non-worktree sessions



## `boa session set-worktree-name`

Edit a managed worktree session's workdir directory name (and, optionally, its git branch). Moves the worktree directory in place; the session must not be running. See #1723

**Usage:** `boa session set-worktree-name [OPTIONS] --name <NAME> [IDENTIFIER]`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title (optional, auto-detects in tmux)

###### **Options:**

* `--name <NAME>` — New workdir (worktree directory) name
* `--rename-branch` — Also rename the underlying git branch to match the new name



## `boa session capture`

Capture tmux pane output

**Usage:** `boa session capture [OPTIONS] [IDENTIFIER]`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title (auto-detects in tmux if omitted)

###### **Options:**

* `-n`, `--lines <LINES>` — Number of lines to capture

  Default value: `50`
* `--strip-ansi` — Strip ANSI escape codes
* `--json` — Output as JSON



## `boa session current`

Auto-detect current session

**Usage:** `boa session current [OPTIONS]`

###### **Options:**

* `-q`, `--quiet` — Just session name (for scripting)
* `--json` — Output as JSON



## `boa session set-session-id`

Set the resume target for a session (pin a conversation or force a one-shot fresh start)

**Usage:** `boa session set-session-id <IDENTIFIER> <SESSION_ID>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title
* `<SESSION_ID>` — Resume target: a UUID/sid pins the next launches to that conversation; an empty string forces a one-shot fresh start (after which the system reverts to auto-resume)



## `boa session set-base`

Set or clear the per-session diff base branch. The diff view compares the worktree against this ref instead of the auto-detected default. Useful when the PR target differs from the project default (stacked PRs, hotfix off `release/*`, renamed default branch). See #970

**Usage:** `boa session set-base [OPTIONS] <IDENTIFIER> [BRANCH]`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title
* `<BRANCH>` — Branch ref to diff against (short name like `main` or remote-qualified like `upstream/main`). Required unless `--clear` is passed

###### **Options:**

* `--clear` — Clear the override and fall back to the profile default / auto-detected base



## `boa session snooze`

Snooze a session for a duration (temporary archive, auto wakes)

**Usage:** `boa session snooze [OPTIONS] <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title

###### **Options:**

* `--minutes <MINUTES>` — Snooze duration in minutes; if omitted, uses `session.snooze_duration_minutes` from the active config (default 30)



## `boa session unsnooze`

Wake a snoozed session immediately

**Usage:** `boa session unsnooze <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title



## `boa session favorite`

Mark a session as a favorite. Favorited rows pin to the top of their status tier in the Attention sort and render with a leading `* ` glyph plus bold + underline

**Usage:** `boa session favorite <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title



## `boa session unfavorite`

Clear the favorite flag on a session

**Usage:** `boa session unfavorite <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title



## `boa session archive`

Archive a session: sink it in the Attention sort and tear down its tmux sessions. Worktree, branch, container preserved. `--no-kill` skips tmux teardown. See #1868

**Usage:** `boa session archive [OPTIONS] <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title

###### **Options:**

* `--no-kill` — Skip tmux teardown on archive



## `boa session unarchive`

Unarchive a session (restores it to its tier in the Attention sort)

**Usage:** `boa session unarchive <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title



## `boa session restore`

Restore a trashed session, returning it to its prior bucket with its transcript and metadata intact. See #2489

**Usage:** `boa session restore <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title



## `boa session list-trash`

List the sessions currently in the trash

**Usage:** `boa session list-trash`



## `boa session empty-trash`

Permanently purge every trashed session in the profile (irreversible)

**Usage:** `boa session empty-trash`



## `boa group`

Manage groups for organizing sessions

**Usage:** `boa group <COMMAND>`

###### **Subcommands:**

* `list` — List all groups
* `create` — Create a new group
* `delete` — Delete a group
* `move` — Move session to group



## `boa group list`

List all groups

**Usage:** `boa group list [OPTIONS]`

###### **Options:**

* `--json` — Output as JSON



## `boa group create`

Create a new group

**Usage:** `boa group create [OPTIONS] <NAME>`

###### **Arguments:**

* `<NAME>` — Group name

###### **Options:**

* `--parent <PARENT>` — Parent group for creating subgroups



## `boa group delete`

Delete a group

**Usage:** `boa group delete [OPTIONS] <NAME>`

###### **Arguments:**

* `<NAME>` — Group name

###### **Options:**

* `--force` — Force delete by moving sessions to default group



## `boa group move`

Move session to group

**Usage:** `boa group move <IDENTIFIER> <GROUP>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title
* `<GROUP>` — Target group



## `boa plugin`

Manage plugins (list, info, enable, disable, install, update, uninstall)

**Usage:** `boa plugin <COMMAND>`

###### **Subcommands:**

* `list` — List every known plugin with version, validation, and state
* `info` — Show one plugin's manifest details
* `enable` — Enable a plugin's contributions
* `disable` — Disable a plugin; its settings stay on disk for re-enabling
* `install` — Install an external plugin from a `gh:owner/repo[@ref]` slug or a local directory. With no `@ref`, installs the repo's latest release; an explicit `@ref` installs unverified, un-audited code. Community plugins run at your own risk
* `update` — Update an installed external plugin from its recorded source. Prompts to re-approve capabilities if the update changes the capability set
* `uninstall` — Uninstall an external plugin, removing its files and capability grant
* `hash` — Print the deterministic source tree hash for a plugin directory, the value a maintainer pins in the featured index
* `discover` — Search GitHub's `boa-plugin` topic for installable plugins
* `outdated` — List installed external plugins that have an update available



## `boa plugin list`

List every known plugin with version, validation, and state

**Usage:** `boa plugin list`



## `boa plugin info`

Show one plugin's manifest details

**Usage:** `boa plugin info <ID>`

###### **Arguments:**

* `<ID>` — Plugin id, e.g. `boa.web`



## `boa plugin enable`

Enable a plugin's contributions

**Usage:** `boa plugin enable <ID>`

###### **Arguments:**

* `<ID>` — Plugin id



## `boa plugin disable`

Disable a plugin; its settings stay on disk for re-enabling

**Usage:** `boa plugin disable <ID>`

###### **Arguments:**

* `<ID>` — Plugin id



## `boa plugin install`

Install an external plugin from a `gh:owner/repo[@ref]` slug or a local directory. With no `@ref`, installs the repo's latest release; an explicit `@ref` installs unverified, un-audited code. Community plugins run at your own risk

**Usage:** `boa plugin install [OPTIONS] <SOURCE>`

###### **Arguments:**

* `<SOURCE>` — `gh:owner/repo` (latest release) or `gh:owner/repo@ref` (unverified) or a local directory path

###### **Options:**

* `--yes` — Grant all requested capabilities without prompting



## `boa plugin update`

Update an installed external plugin from its recorded source. Prompts to re-approve capabilities if the update changes the capability set

**Usage:** `boa plugin update <ID>`

###### **Arguments:**

* `<ID>` — Plugin id



## `boa plugin uninstall`

Uninstall an external plugin, removing its files and capability grant

**Usage:** `boa plugin uninstall <ID>`

###### **Arguments:**

* `<ID>` — Plugin id



## `boa plugin hash`

Print the deterministic source tree hash for a plugin directory, the value a maintainer pins in the featured index

**Usage:** `boa plugin hash <PATH>`

###### **Arguments:**

* `<PATH>` — Path to the plugin directory



## `boa plugin discover`

Search GitHub's `boa-plugin` topic for installable plugins

**Usage:** `boa plugin discover [QUERY]`

###### **Arguments:**

* `<QUERY>` — Optional free-text term to narrow the search



## `boa plugin outdated`

List installed external plugins that have an update available

**Usage:** `boa plugin outdated`



## `boa profile`

Manage profiles (separate workspaces)

**Usage:** `boa profile [COMMAND]`

###### **Subcommands:**

* `list` — List all profiles
* `create` — Create a new profile
* `delete` — Delete a profile
* `rename` — Rename a profile
* `default` — Show or set default profile



## `boa profile list`

List all profiles

**Usage:** `boa profile list`



## `boa profile create`

Create a new profile

**Usage:** `boa profile create <NAME>`

###### **Arguments:**

* `<NAME>` — Profile name



## `boa profile delete`

Delete a profile

**Usage:** `boa profile delete <NAME>`

###### **Arguments:**

* `<NAME>` — Profile name



## `boa profile rename`

Rename a profile

**Usage:** `boa profile rename <OLD_NAME> <NEW_NAME>`

###### **Arguments:**

* `<OLD_NAME>` — Current profile name
* `<NEW_NAME>` — New profile name



## `boa profile default`

Show or set default profile

**Usage:** `boa profile default [NAME]`

###### **Arguments:**

* `<NAME>` — Profile name (optional, shows current if not provided)



## `boa project`

Manage the project registry used by multi-repo session pickers

**Usage:** `boa project <COMMAND>`

###### **Subcommands:**

* `list` — List registered projects
* `add` — Add a project to the registry
* `remove` — Remove a project from the registry



## `boa project list`

List registered projects

**Usage:** `boa project list [OPTIONS]`

###### **Options:**

* `--json` — Output as JSON
* `--scope <SCOPE>` — Filter by scope (default: all)

  Default value: `all`

  Possible values: `all`, `global`, `profile`




## `boa project add`

Add a project to the registry

**Usage:** `boa project add [OPTIONS] <PATH>`

###### **Arguments:**

* `<PATH>` — Path to the project directory: a git repository, or any directory to run sessions in place

###### **Options:**

* `--name <NAME>` — Display name (defaults to the directory's basename)
* `--scope <SCOPE>` — Registry scope. When omitted: defaults to GLOBAL, unless `-p <profile>` was passed at the top level, in which case it defaults to PROFILE (scoping the entry to that profile only)

  Possible values: `global`, `profile`

* `--allow-override` — Allow registering this path even if it already exists in the other scope. Without this flag the command errors when the same canonical path is already registered globally (when adding to profile) or in any profile (when adding globally). When override is allowed and both scopes hold the same path, the profile entry shadows the global one
* `--base-branch <BASE_BRANCH>` — Default base branch for new worktree branches created against this project, whether it is the launch repo or an extra repo in a multi-repo workspace. An explicit session base wins; when omitted, falls back to the global/profile `worktree.default_base_branch`, then the repo's detected default branch



## `boa project remove`

Remove a project from the registry

**Usage:** `boa project remove [OPTIONS] <NAME_OR_PATH>`

###### **Arguments:**

* `<NAME_OR_PATH>` — Project name or path to remove

###### **Options:**

* `--scope <SCOPE>` — Registry scope to remove from. When omitted: defaults to GLOBAL, unless `-p <profile>` was passed at the top level, in which case it defaults to PROFILE

  Possible values: `global`, `profile`




## `boa worktree`

Manage git worktrees for parallel development

**Usage:** `boa worktree <COMMAND>`

###### **Subcommands:**

* `list` — List all worktrees in current repository
* `info` — Show worktree information for a session
* `cleanup` — Cleanup orphaned worktrees



## `boa worktree list`

List all worktrees in current repository

**Usage:** `boa worktree list`



## `boa worktree info`

Show worktree information for a session

**Usage:** `boa worktree info <IDENTIFIER>`

###### **Arguments:**

* `<IDENTIFIER>` — Session ID or title



## `boa worktree cleanup`

Cleanup orphaned worktrees

**Usage:** `boa worktree cleanup [OPTIONS]`

###### **Options:**

* `-f`, `--force` — Actually remove worktrees (default is dry-run)



## `boa tmux`

tmux integration utilities

**Usage:** `boa tmux <COMMAND>`

###### **Subcommands:**

* `status` — Output session info for use in custom tmux status bar



## `boa tmux status`

Output session info for use in custom tmux status bar

Add this to your ~/.tmux.conf: set -g status-right "#(BOA tmux status)"

**Usage:** `boa tmux status [OPTIONS]`

###### **Options:**

* `-f`, `--format <FORMAT>` — Output format (text or json)

  Default value: `text`



## `boa sounds`

Manage sound effects for agent state transitions

**Usage:** `boa sounds <COMMAND>`

###### **Subcommands:**

* `install` — Install bundled sound effects
* `list` — List currently installed sounds
* `test` — Test a sound by playing it



## `boa sounds install`

Install bundled sound effects

**Usage:** `boa sounds install`



## `boa sounds list`

List currently installed sounds

**Usage:** `boa sounds list`



## `boa sounds test`

Test a sound by playing it

**Usage:** `boa sounds test <NAME>`

###### **Arguments:**

* `<NAME>` — Sound file name (without extension)



## `boa theme`

Manage color themes (list, export, customize)

**Usage:** `boa theme <COMMAND>`

###### **Subcommands:**

* `list` — List all available themes (built-in and custom)
* `export` — Export a built-in theme as a TOML file for customization
* `dir` — Show the custom themes directory path



## `boa theme list`

List all available themes (built-in and custom)

**Usage:** `boa theme list`



## `boa theme export`

Export a built-in theme as a TOML file for customization

**Usage:** `boa theme export [OPTIONS] <NAME>`

###### **Arguments:**

* `<NAME>` — Theme name to export

###### **Options:**

* `-o`, `--output <OUTPUT>` — Output file path (defaults to `<name>.toml` in the themes directory)



## `boa theme dir`

Show the custom themes directory path

**Usage:** `boa theme dir`



## `boa settings`

Inspect resolved settings and their provenance

**Usage:** `boa settings <COMMAND>`

###### **Subcommands:**

* `explain` — Explain where a setting's effective value comes from. KEY is a core `section.field` (e.g. `acp.default_agent`) or a plugin `plugin:<id>.<field>` (e.g. `plugin:acme.kit.retries`)



## `boa settings explain`

Explain where a setting's effective value comes from. KEY is a core `section.field` (e.g. `acp.default_agent`) or a plugin `plugin:<id>.<field>` (e.g. `plugin:acme.kit.retries`)

**Usage:** `boa settings explain <KEY>`

###### **Arguments:**

* `<KEY>` — The setting key to explain



## `boa telemetry`

Manage anonymous opt-in usage telemetry

**Usage:** `boa telemetry <COMMAND>`

###### **Subcommands:**

* `status` — Show the current telemetry opt-in state and install id
* `enable` — Opt in to anonymous usage telemetry
* `disable` — Opt out of telemetry (deletes the local install id)
* `reset-id` — Generate a fresh anonymous install id (only while opted in)



## `boa telemetry status`

Show the current telemetry opt-in state and install id

**Usage:** `boa telemetry status`



## `boa telemetry enable`

Opt in to anonymous usage telemetry

**Usage:** `boa telemetry enable`



## `boa telemetry disable`

Opt out of telemetry (deletes the local install id)

**Usage:** `boa telemetry disable`



## `boa telemetry reset-id`

Generate a fresh anonymous install id (only while opted in)

**Usage:** `boa telemetry reset-id`



## `boa mcp`

Inspect the effective MCP server set (provenance, conflicts, drift)

**Usage:** `boa mcp <COMMAND>`

###### **Subcommands:**

* `list` — List the merged effective MCP server set with provenance, plus any conflicts and servers kept after removal from a native config



## `boa mcp list`

List the merged effective MCP server set with provenance, plus any conflicts and servers kept after removal from a native config

**Usage:** `boa mcp list [OPTIONS]`

###### **Options:**

* `--agent <AGENT>` — Agent whose effective set to resolve. Defaults to the configured default tool. MCP forwarding is per-agent because the agent-native layer differs
* `--json` — Output machine-readable JSON instead of a table



## `boa serve`

Start a web dashboard for remote session access

**Usage:** `boa serve [OPTIONS]`

###### **Options:**

* `--port <PORT>` — Port to listen on (default: 8080; debug builds default to 8081 so a `cargo run` instance does not collide with an installed release `boa`)
* `--host <HOST>` — Host/IP to bind to (use 0.0.0.0 for LAN/VPN access)

  Default value: `127.0.0.1`
* `--auth <AUTH>` — Authentication mode: `token` (default, random URL token), `passphrase` (no token URL, passphrase login wall only), or `none` (no auth at all, loopback-only unless --behind-proxy). Mutually exclusive with --no-auth (which aliases --auth=none)

  Possible values: `token`, `passphrase`, `none`

* `--no-auth` — Disable authentication (only allowed with localhost binding). Alias for --auth=none
* `--behind-proxy` — Mark this server as sitting behind a reverse proxy that terminates TLS upstream. Sets cookies as `; Secure` and trusts the `X-Forwarded-For` / `cf-connecting-ip` headers from loopback peers. Does NOT auto-spawn a tunnel (unlike --remote). Required when --auth=passphrase or --auth=none is combined with a non-loopback bind
* `--read-only` — Read-only mode: view terminals but cannot send keystrokes
* `--remote` — Expose the dashboard over a public HTTPS tunnel. Prefers Tailscale Funnel when `tailscale` is installed and logged in (stable `.ts.net` URL, installable PWAs survive restarts). Falls back to a Cloudflare quick tunnel otherwise (fresh URL on every restart)
* `--tunnel-name <TUNNEL_NAME>` — Use a named Cloudflare Tunnel (requires prior `cloudflared tunnel create`). Takes precedence over Tailscale auto-detection
* `--no-tailscale` — Skip Tailscale Funnel auto-detection and go straight to Cloudflare. Useful if you have Tailscale installed for unrelated reasons
* `--tunnel-url <TUNNEL_URL>` — Hostname for a named tunnel (e.g., boa.example.com)
* `--daemon` — Run as a background daemon (detach from terminal)
* `--stop` — Stop a running daemon
* `--status` — Print the running daemon's PID, mode, URLs, and log path. Exits non-zero when no daemon is running. Useful for shell scripts that want to know whether a daemon is up without parsing `ps`.

   `--status` is read-only and incompatible with every flag that would change daemon state (`--stop`, `--daemon`, `--remote`) or the bind config of a fresh daemon (`--no-auth`, `--auth`, `--behind-proxy`, `--read-only`, `--passphrase`, `--port`, `--tunnel-name`, `--no-tailscale`, `--tunnel-url`, `--open`). Clap reports the misuse instead of silently ignoring the extras.
* `--passphrase <PASSPHRASE>` — Require a passphrase for login (second-factor auth). Can also be set via AOE_SERVE_PASSPHRASE environment variable
* `--open` — Open the dashboard URL in the default browser once the server is ready. Ignored under --daemon, --remote, SSH (SSH_CONNECTION/SSH_TTY), or when no display server is reachable on Linux/BSD
* `--restart` — Restart a running `boa serve` daemon, replaying the host, port, mode, and auth it was launched with (read from `serve.launch`). The passphrase is recalled from `serve.passphrase` or `AOE_SERVE_PASSPHRASE` before the old daemon is stopped, so a passphrase-protected daemon is never left down. Incompatible with the flags that would change the daemon's bind config: that config comes from the persisted launch state



## `boa url`

Print the current dashboard URL of a running `boa serve` daemon

**Usage:** `boa url [OPTIONS]`

###### **Options:**

* `--all` — Print every labeled URL (Tailscale / LAN / localhost) on its own line. The primary URL is printed first as `primary\t<url>`; alternates use `<label>\t<url>`. The tab-separated format makes the output easy to parse from shell scripts
* `--token-only` — Print only the auth token from the primary URL's `?token=` query parameter. Useful for scripted login flows or pasting into the PWA. Exits non-zero when the URL has no token (e.g. `--no-auth` server)



## `boa acp`

Manage the ACP structured-view workers (doctor, ps, logs, prompt, approve, ...)

**Usage:** `boa acp <COMMAND>`

###### **Subcommands:**

* `doctor` — Verify the structured view can start: Node runtime, configured agents, provider auth (claude login)
* `agents` — List configured agents (claude-code, aoe-agent, etc.)
* `ps` — List running agent workers (detached or attached)
* `stop` — Gracefully stop an agent worker (SIGTERM the runner, agent receives stdin EOF). Sessions can be reattached on the next `boa serve` only if they are still alive afterward; `stop` destroys the worker
* `kill` — SIGKILL a worker immediately (use when `stop` doesn't take)
* `logs` — Tail the runner's log file for an agent session
* `restart` — Restart a wedged agent worker: stop the existing runner, then let the daemon's reconciler spawn a fresh one on the next tick
* `history` — Print the persisted transcript for an agent session
* `status` — Print live status for an agent session: highest/lowest seq, and whether the on-disk retention window has truncated history
* `prompt` — Send a prompt to an agent session's agent
* `approve` — Resolve a pending approval (default: allow). Use --always for a session-scoped allow-list entry, --deny to refuse the request
* `cancel` — Cancel the in-flight prompt for an agent session
* `tail` — Stream the agent broadcast for a session to stdout as JSON lines (one frame per line). Press Ctrl-C to stop
* `attach` — Open the TUI structured view directly for a known session id. Combine with `AOE_DAEMON_URL` (+ `AOE_DAEMON_TOKEN`) to attach across machines without going through the home session list
* `switch-agent` — Switch an agent session to a different ACP agent, keeping the transcript. The new agent starts fresh; use `boa acp agents` to list valid targets. Handy for returning to claude after a rate-limit handoff to codex



## `boa acp doctor`

Verify the structured view can start: Node runtime, configured agents, provider auth (claude login)

**Usage:** `boa acp doctor [OPTIONS]`

###### **Options:**

* `--json` — Emit machine-readable JSON instead of a human report
* `--fix` — Attempt safe remediations: install missing claude-code-acp adapter, verify aoe-agent presence, etc. (Reserved for future release; the flag exists so scripts can opt in early.)



## `boa acp agents`

List configured agents (claude-code, aoe-agent, etc.)

**Usage:** `boa acp agents`



## `boa acp ps`

List running agent workers (detached or attached)

**Usage:** `boa acp ps [OPTIONS]`

###### **Options:**

* `--json` — Emit machine-readable JSON instead of a table



## `boa acp stop`

Gracefully stop an agent worker (SIGTERM the runner, agent receives stdin EOF). Sessions can be reattached on the next `boa serve` only if they are still alive afterward; `stop` destroys the worker

**Usage:** `boa acp stop [OPTIONS] [SESSION]`

###### **Arguments:**

* `<SESSION>` — Session id to stop. Mutually exclusive with `--all`

###### **Options:**

* `--all` — Stop every running agent worker
* `--timeout-secs <TIMEOUT_SECS>` — Seconds to wait after SIGTERM before escalating to SIGKILL

  Default value: `5`



## `boa acp kill`

SIGKILL a worker immediately (use when `stop` doesn't take)

**Usage:** `boa acp kill <SESSION>`

###### **Arguments:**

* `<SESSION>` — Session id to kill



## `boa acp logs`

Tail the runner's log file for an agent session

**Usage:** `boa acp logs [OPTIONS]`

###### **Options:**

* `--session <SESSION>` — Session id whose worker logs to tail
* `--follow` — Follow new lines as they arrive



## `boa acp restart`

Restart a wedged agent worker: stop the existing runner, then let the daemon's reconciler spawn a fresh one on the next tick

**Usage:** `boa acp restart <SESSION>`

###### **Arguments:**

* `<SESSION>` — Session id whose worker to restart



## `boa acp history`

Print the persisted transcript for an agent session

**Usage:** `boa acp history [OPTIONS] <SESSION>`

###### **Arguments:**

* `<SESSION>` — Acp session id

###### **Options:**

* `--since <SINCE>` — Skip events at or below this seq

  Default value: `0`
* `--json` — Emit raw frames as JSON (one frame per line)



## `boa acp status`

Print live status for an agent session: highest/lowest seq, and whether the on-disk retention window has truncated history

**Usage:** `boa acp status [OPTIONS] <SESSION>`

###### **Arguments:**

* `<SESSION>` — Acp session id

###### **Options:**

* `--json` — Emit machine-readable JSON instead of a human report



## `boa acp prompt`

Send a prompt to an agent session's agent

**Usage:** `boa acp prompt <SESSION> <TEXT>`

###### **Arguments:**

* `<SESSION>` — Acp session id
* `<TEXT>` — Prompt text. Pass `-` to read from stdin



## `boa acp approve`

Resolve a pending approval (default: allow). Use --always for a session-scoped allow-list entry, --deny to refuse the request

**Usage:** `boa acp approve [OPTIONS] <SESSION> <NONCE>`

###### **Arguments:**

* `<SESSION>` — Acp session id
* `<NONCE>` — Approval nonce, as printed in the pending-approval banner

###### **Options:**

* `--always` — Allow this kind of operation for the rest of the session
* `--deny` — Refuse the request



## `boa acp cancel`

Cancel the in-flight prompt for an agent session

**Usage:** `boa acp cancel <SESSION>`

###### **Arguments:**

* `<SESSION>` — Acp session id



## `boa acp tail`

Stream the agent broadcast for a session to stdout as JSON lines (one frame per line). Press Ctrl-C to stop

**Usage:** `boa acp tail [OPTIONS] <SESSION>`

###### **Arguments:**

* `<SESSION>` — Acp session id

###### **Options:**

* `--since <SINCE>` — Start at this seq (default 0 = full replay then live)

  Default value: `0`



## `boa acp attach`

Open the TUI structured view directly for a known session id. Combine with `AOE_DAEMON_URL` (+ `AOE_DAEMON_TOKEN`) to attach across machines without going through the home session list

**Usage:** `boa acp attach <SESSION>`

###### **Arguments:**

* `<SESSION>` — Acp session id



## `boa acp switch-agent`

Switch an agent session to a different ACP agent, keeping the transcript. The new agent starts fresh; use `boa acp agents` to list valid targets. Handy for returning to claude after a rate-limit handoff to codex

**Usage:** `boa acp switch-agent [OPTIONS] <SESSION> <TARGET>`

###### **Arguments:**

* `<SESSION>` — Acp session id
* `<TARGET>` — Registry key of the target agent (e.g. `claude`, `codex`)

###### **Options:**

* `--model <MODEL>` — Optional model override forwarded to the new agent



## `boa uninstall`

Uninstall Band of Agents

**Usage:** `boa uninstall [OPTIONS]`

###### **Options:**

* `--keep-data` — Keep data directory (sessions, config, logs)
* `--keep-tmux-config` — Keep tmux configuration
* `--dry-run` — Show what would be removed without removing
* `-y` — Skip confirmation prompts



## `boa update`

Update BOA to the latest release

**Usage:** `boa update [OPTIONS]`

###### **Options:**

* `-y`, `--yes` — Skip confirmation prompt
* `--check` — Print update status and exit (no install)
* `--dry-run` — Detect install method and print what would happen, no download



## `boa completion`

Generate shell completions

**Usage:** `boa completion <SHELL>`

###### **Arguments:**

* `<SHELL>` — Shell to generate completions for

  Possible values: `bash`, `elvish`, `fish`, `powershell`, `zsh`




<hr/>

<small><i>
    This document was generated automatically by
    <a href="https://crates.io/crates/clap-markdown"><code>clap-markdown</code></a>.
</i></small>
