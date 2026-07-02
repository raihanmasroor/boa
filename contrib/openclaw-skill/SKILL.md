---
name: boa
description: Manage AI coding agent sessions via Band of Agents (boa)
metadata:
  openclaw:
    requires:
      bins:
        - boa
        - tmux
    homepage: https://github.com/agent-of-empires/agent-of-empires
---

# Band of Agents (boa) Skill

Use `boa` to create, manage, and monitor AI coding agent sessions (Claude Code, Codex, OpenCode, etc.) in tmux. Prefer `boa` over raw `tmux` commands for agent management.

## When to use this skill

- Launching one or more AI coding agents on project directories
- Monitoring agent progress (waiting vs running vs idle)
- Capturing agent output for review
- Organizing agents into groups or profiles
- Setting up parallel worktree-based development

Do NOT use this skill for general tmux window/pane management unrelated to coding agents.

## Core concepts

- **Session**: An agent process running in a tmux session. Each session has an ID, title, tool (e.g. `claude`), and project path.
- **Group**: A named folder for organizing sessions (supports nesting with `/`, e.g. `backend/api`).
- **Profile**: A separate workspace with its own sessions and config. Use `-p <name>` globally or set `AGENT_OF_EMPIRES_PROFILE`.
- **Status**: One of `running`, `waiting`, `idle`, `stopped`, `error`, `starting`, `unknown`.

## Command reference

### Adding sessions

```bash
# Add a session for the current directory
boa add . -t "my feature"

# Add with group, launch immediately
boa add /path/to/repo -t "API work" -g backend -l

# Add with specific tool
boa add . -t "codex session" -c codex

# Add in a git worktree (parallel branch)
boa add . -t "fix-123" -w fix/issue-123 -l

# Add in Docker sandbox
boa add . -t "sandboxed" -s -l

# Add as sub-session of another
boa add . -t "sub task" -P <parent-id>

# Enable YOLO mode (skip permission prompts)
boa add . -t "yolo" -y -l
```

### Listing sessions

```bash
# Human-readable list
boa list

# JSON output for parsing
boa list --json

# List across all profiles
boa list --all
```

**JSON output shape** (`boa list --json`):
```json
[
  {
    "id": "a1b2c3d4-...",
    "title": "my feature",
    "path": "/home/user/project",
    "group": "backend",
    "tool": "claude",
    "command": "claude",
    "profile": "default",
    "created_at": "2025-01-01T00:00:00Z",
    "workspace_repos": []
  }
]
```

`command` is omitted when empty; `worktree` appears only for worktree-backed sessions. `list --json` does not include live status; use `boa status --json` or `boa session capture --json` for that.

### Session lifecycle

```bash
boa session start <id-or-title>
boa session stop <id-or-title>
boa session restart <id-or-title>
boa session attach <id-or-title>   # interactive attach
```

### Inspecting sessions

```bash
# Show session metadata
boa session show <id-or-title> --json

# Capture tmux pane content (key for monitoring)
boa session capture <id-or-title> --json
boa session capture <id-or-title> -n 100 --strip-ansi
boa session capture <id-or-title>   # plain text, good for piping

# Quick status summary
boa status --json
boa status -q   # just the waiting count (for scripting)
```

**JSON output shape** (`boa session capture --json`):
```json
{
  "id": "a1b2c3d4-...",
  "title": "my feature",
  "status": "waiting",
  "tool": "claude",
  "content": "... pane text ...",
  "lines": 50
}
```

**JSON output shape** (`boa session show --json`):
```json
{
  "id": "a1b2c3d4-...",
  "title": "my feature",
  "path": "/home/user/project",
  "group": "backend",
  "tool": "claude",
  "command": "claude",
  "status": "running",
  "profile": "default"
}
```

**JSON output shape** (`boa status --json`):
```json
{
  "waiting": 1,
  "running": 2,
  "idle": 1,
  "stopped": 1,
  "error": 0,
  "total": 5
}
```

### Auto-detection (inside a tmux pane)

When called from within a boa-managed tmux session, identifier can be omitted:

```bash
boa session show          # auto-detects current session
boa session capture       # auto-detects current session
boa session current --json
```

### Renaming and organizing

```bash
boa session rename <id> -t "new title"
boa session rename <id> -g "new/group"

boa group create mygroup
boa group move <id-or-title> mygroup
boa group list --json
boa group delete mygroup --force
```

### Profiles

```bash
boa profile list
boa profile create staging
boa profile delete staging
boa profile default staging   # set default
boa -p staging list            # use inline
```

### Worktrees

```bash
boa worktree list
boa worktree info <id-or-title>
boa worktree cleanup -f
```

### Removing sessions

```bash
boa remove <id-or-title>
boa remove <id-or-title> --delete-worktree --force
```

## Workflow patterns

### Single agent

```bash
boa add /path/to/repo -t "feature X" -l
# ... wait ...
boa session capture "feature X" --json
```

### Parallel worktree agents

```bash
boa add . -t "issue-100" -w fix/issue-100 -l
boa add . -t "issue-101" -w fix/issue-101 -l
boa add . -t "issue-102" -w fix/issue-102 -l
boa status --json   # check all at once
```

### Monitoring loop

Poll all sessions until none are running:

```bash
while true; do
  status=$(boa status --json)
  waiting=$(echo "$status" | jq '.waiting')
  running=$(echo "$status" | jq '.running')
  if [ "$running" -eq 0 ] && [ "$waiting" -eq 0 ]; then
    echo "All agents finished"
    break
  fi
  echo "Running: $running, Waiting: $waiting"
  sleep 30
done
```

### Capture and review

```bash
for id in $(boa list --json | jq -r '.[].id'); do
  echo "=== $id ==="
  boa session capture "$id" -n 100 --strip-ansi
  echo
done
```

### Group operations via TUI

Groups are primarily managed through the `boa` TUI (run `boa` with no arguments). The TUI supports bulk start/stop/restart on groups. Use CLI commands above for scripted workflows.
