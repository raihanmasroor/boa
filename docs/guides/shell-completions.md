# Shell Completions

`boa completion <shell>` prints a tab-completion script for your shell. It supports `bash`, `zsh`, `fish`, `powershell`, and `elvish`. The script is rendered from the binary's command tree at the moment you run the command, so it always matches the version of `boa` that produced it.

There are two ways to wire it up. Pick one per shell.

## Recommended: eval on shell startup

Source the completions every time your shell starts. The script is regenerated from the current binary on each launch, so it never goes stale after a `boa update`. The cost is a few milliseconds added to shell startup.

This is the pattern `gh`, `rustup`, and `kubectl` recommend.

**Bash** (add to `~/.bashrc`):

```bash
eval "$(boa completion bash)"
```

**Zsh** (add to `~/.zshrc`, before any `compinit` call):

```zsh
eval "$(boa completion zsh)"
```

**Fish** (add to `~/.config/fish/config.fish`):

```fish
boa completion fish | source
```

**PowerShell** (add to your `$PROFILE`):

```powershell
boa completion powershell | Out-String | Invoke-Expression
```

**Elvish** (add to `~/.config/elvish/rc.elv`):

```elvish
eval (boa completion elvish | slurp)
```

## Alternative: static file

Write the script to a file your shell loads at startup. This avoids the per-launch cost, but the file is a snapshot: after a `boa update` adds or renames a subcommand or flag, the file is stale until you regenerate it (see [Keeping static completions fresh](#keeping-static-completions-fresh)).

**Bash:**

```bash
boa completion bash > ~/.local/share/bash-completion/completions/boa
```

**Zsh** (ensure `~/.zfunc` is on your `fpath` in `~/.zshrc` before `compinit`):

```zsh
boa completion zsh > ~/.zfunc/_boa
```

**Fish:**

```fish
boa completion fish > ~/.config/fish/completions/boa.fish
```

**PowerShell** (write to a dedicated file, then dot-source it from your profile; redirecting straight into `$PROFILE` would overwrite the profile script itself):

```powershell
$dir = Split-Path -Parent $PROFILE.CurrentUserAllHosts
New-Item -ItemType Directory -Force -Path $dir | Out-Null
boa completion powershell > "$dir\boa.completion.ps1"
# Add this line to $PROFILE.CurrentUserAllHosts:
#   . "$PSScriptRoot\boa.completion.ps1"
```

**Elvish:**

```elvish
boa completion elvish > ~/.elvish/lib/boa.elv
```

Restart your shell, or re-source the relevant file, after installing.

## Keeping static completions fresh

A static completion file does not update itself. Each time you run `boa update`, regenerate the file so it reflects any new subcommands or flags:

```bash
boa completion zsh > ~/.zfunc/_boa   # adjust shell and path to match your install
```

`boa update` prints a reminder about this after a successful update. If you would rather not think about it, use the eval-on-startup method above; it is always in sync with the installed binary.
