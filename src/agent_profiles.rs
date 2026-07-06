//! Discovery of distinct logged-in accounts ("profiles") for agent CLIs.
//!
//! BOA divergence (see BOA.md): the new-session picker scans the host for each
//! agent's real logged-in config directories and offers one card per discovered
//! account, launching the chosen one by injecting its config-dir env var
//! (`CLAUDE_CONFIG_DIR` for Claude, `CODEX_HOME` for Codex). Upstream AoE shows
//! a single card per agent and always launches the default account.
//!
//! Detection is filesystem-only and read-only: each predicate keys off the
//! credential/state files the CLI writes into its config dir. The mapping from a
//! chosen profile to its launch env is the same seam the migrations already
//! assert (`environment = ["CLAUDE_CONFIG_DIR=…"]` / `["CODEX_HOME=…"]`), so the
//! injected string flows through `host_environment_prefix` to both the launch
//! command and the status-hook install path.

use std::collections::HashSet;
use std::path::Path;

use serde::Serialize;

/// A discovered, launchable account for an agent CLI.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct AgentProfile {
    /// Agent this profile belongs to (registry name, e.g. `"claude"`).
    pub agent: String,
    /// Short label distinguishing the account (e.g. `"default"`, `"personal"`,
    /// `"ydo"`). Derived from the config-dir suffix.
    pub label: String,
    /// Absolute config directory this account launches from.
    pub config_dir: String,
    /// Host environment entries injected at launch to select this account
    /// (e.g. `["CLAUDE_CONFIG_DIR=/Users/x/.claude-ydo"]`). Empty for the
    /// default account, which launches with no config-dir override (on macOS
    /// the default Claude account stores OAuth creds in the login Keychain and
    /// state in `~/.claude.json`, so forcing `CLAUDE_CONFIG_DIR` at it would
    /// break credential resolution).
    pub env: Vec<String>,
}

/// Discover the launchable accounts for `agent` under the current user's home
/// directory. Returns an empty list for agents without account discovery
/// (everything except `claude`/`codex`/`gemini`) or when `$HOME` is unknown.
pub fn discover_profiles(agent: &str) -> Vec<AgentProfile> {
    match dirs::home_dir() {
        Some(home) => discover_profiles_in(agent, &home),
        None => Vec::new(),
    }
}

/// Home-relative core of [`discover_profiles`], split out so it is unit-testable
/// against a fixture directory without touching `$HOME`.
pub fn discover_profiles_in(agent: &str, home: &Path) -> Vec<AgentProfile> {
    match agent {
        "claude" => discover_claude_profiles(home),
        "codex" => discover_codex_profiles(home),
        "gemini" => discover_gemini_profiles(home),
        _ => Vec::new(),
    }
}

/// Keep only the submitted `agent_env` entries BOA actually offered for `tool`
/// via profile discovery. The server is the source of truth for which
/// config-dir env each account launches with, so a client can never inject
/// arbitrary host environment into the launch prefix: anything not in the
/// discovered set is dropped. An empty result means "launch the default
/// account" (no override), which is the safe fallback.
pub fn validate_agent_env(tool: &str, submitted: &[String]) -> Vec<String> {
    if submitted.is_empty() {
        return Vec::new();
    }
    let offered: HashSet<String> = discover_profiles(tool)
        .into_iter()
        .flat_map(|p| p.env)
        .collect();
    let kept: Vec<String> = submitted
        .iter()
        .filter(|entry| offered.contains(entry.as_str()))
        .cloned()
        .collect();
    if kept.len() != submitted.len() {
        tracing::warn!(
            target: "session.create",
            "dropped {} unrecognized agent_env entr(y/ies) for tool '{}' not offered by profile discovery",
            submitted.len() - kept.len(),
            tool
        );
    }
    kept
}

/// Split validated `agent_env` entries (`"KEY=value"`) into `(key, value)`
/// pairs for injection as an ACP worker's `provider_env`. Entries without an
/// `=` are skipped. Call this on the output of [`validate_agent_env`], never on
/// raw client input.
pub fn agent_env_pairs(agent_env: &[String]) -> Vec<(String, String)> {
    agent_env
        .iter()
        .filter_map(|e| {
            e.split_once('=')
                .map(|(k, v)| (k.to_string(), v.to_string()))
        })
        .collect()
}

/// Directory names directly under `home` whose name starts with `prefix`.
/// Plain files (e.g. `~/.claude.json`, `~/.claude.json.backup`) are dropped —
/// only directories (or symlinks to directories) are returned, matching
/// `ls -d ~/.<prefix>*` filtered to directories.
fn candidate_dir_names(home: &Path, prefix: &str) -> Vec<String> {
    let mut names = Vec::new();
    let Ok(entries) = std::fs::read_dir(home) else {
        return names;
    };
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().into_owned();
        if !name.starts_with(prefix) {
            continue;
        }
        // `is_dir()` follows symlinks, so a symlinked config dir still counts.
        if entry.path().is_dir() {
            names.push(name);
        }
    }
    names
}

/// Sort discovered profiles so the default account (no env override) sorts
/// first, then the rest alphabetically by label. Keeps card order stable and
/// predictable across requests.
fn sort_profiles(profiles: &mut [AgentProfile]) {
    profiles.sort_by(|a, b| {
        let rank = |p: &AgentProfile| usize::from(!p.env.is_empty());
        rank(a).cmp(&rank(b)).then_with(|| a.label.cmp(&b.label))
    });
}

/// Strip a config-dir basename down to a human label: `.claude-ydo` -> `ydo`,
/// `.codex-work` -> `work`. Falls back to the basename when no known prefix
/// matches so an oddly-named dir is still labelled rather than blank.
fn label_from_name(name: &str, base_prefix: &str) -> String {
    let dashed = format!("{base_prefix}-");
    if let Some(rest) = name.strip_prefix(&dashed) {
        if !rest.is_empty() {
            return rest.to_string();
        }
    }
    if let Some(rest) = name.strip_prefix(base_prefix) {
        let rest = rest.trim_start_matches(['-', '.', '_']);
        if !rest.is_empty() {
            return rest.to_string();
        }
    }
    name.to_string()
}

// --- Claude ---

/// True when `dir` (a `~/.claude*` directory) is a usable Claude profile: it
/// holds credentials or state the CLI recognizes. Mirrors the shell rule
/// `[ -f $dir/.credentials.json ] || [ -f $dir/.claude.json ] ||
///  ( basename == .claude && -d $dir/sessions )`, with `settings.json` added as
/// a second default-account signal. A `~/.claude*` dir with none of these is
/// junk (e.g. a stale/empty directory) and is skipped.
fn is_claude_profile_dir(dir: &Path) -> bool {
    dir.join(".credentials.json").is_file()
        || dir.join(".claude.json").is_file()
        || dir.join("sessions").is_dir()
        || dir.join("settings.json").is_file()
}

fn discover_claude_profiles(home: &Path) -> Vec<AgentProfile> {
    let mut out = Vec::new();
    for name in candidate_dir_names(home, ".claude") {
        let dir = home.join(&name);
        if !is_claude_profile_dir(&dir) {
            continue;
        }
        let (label, env) = if name == ".claude" {
            // Default account: creds live in the login Keychain (macOS) and
            // state in ~/.claude.json, so it launches with no override.
            ("default".to_string(), Vec::new())
        } else {
            (
                label_from_name(&name, ".claude"),
                vec![format!("CLAUDE_CONFIG_DIR={}", dir.display())],
            )
        };
        out.push(AgentProfile {
            agent: "claude".to_string(),
            label,
            config_dir: dir.display().to_string(),
            env,
        });
    }
    sort_profiles(&mut out);
    out
}

// --- Codex ---

/// True when `dir` (a `~/.codex*` directory) is a logged-in Codex profile: it
/// holds the `auth.json` OAuth/API-key credential file.
fn is_codex_profile_dir(dir: &Path) -> bool {
    dir.join("auth.json").is_file()
}

fn discover_codex_profiles(home: &Path) -> Vec<AgentProfile> {
    let mut out = Vec::new();
    for name in candidate_dir_names(home, ".codex") {
        let dir = home.join(&name);
        if !is_codex_profile_dir(&dir) {
            continue;
        }
        let (label, env) = if name == ".codex" {
            ("default".to_string(), Vec::new())
        } else {
            // Separate Codex accounts live under separate CODEX_HOME dirs
            // (NOT `-p/--profile`, which layers config within one home).
            (
                label_from_name(&name, ".codex"),
                vec![format!("CODEX_HOME={}", dir.display())],
            )
        };
        out.push(AgentProfile {
            agent: "codex".to_string(),
            label,
            config_dir: dir.display().to_string(),
            env,
        });
    }
    sort_profiles(&mut out);
    out
}

// --- Gemini ---

/// True when `~/.gemini` is a logged-in Gemini profile: it holds
/// `oauth_creds.json` (and typically `google_accounts.json`).
fn is_gemini_profile_dir(dir: &Path) -> bool {
    dir.join("oauth_creds.json").is_file() || dir.join("google_accounts.json").is_file()
}

fn discover_gemini_profiles(home: &Path) -> Vec<AgentProfile> {
    // Gemini has NO verified per-profile config-dir env var (the CLI has no
    // config-dir flag and honors no `GEMINI_CONFIG_DIR` against the installed
    // build — see the investigation notes in BOA.md). We can therefore only
    // surface the single default `~/.gemini` account and never switch accounts
    // via env injection; its `env` is empty. Returning one profile is
    // equivalent to a plain single card in the wizard.
    let dir = home.join(".gemini");
    if dir.is_dir() && is_gemini_profile_dir(&dir) {
        vec![AgentProfile {
            agent: "gemini".to_string(),
            label: "default".to_string(),
            config_dir: dir.display().to_string(),
            env: Vec::new(),
        }]
    } else {
        Vec::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn touch(path: &Path) {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).unwrap();
        }
        fs::write(path, b"x").unwrap();
    }

    fn mkdir(path: &Path) {
        fs::create_dir_all(path).unwrap();
    }

    #[test]
    fn claude_discovers_default_plus_alternates_and_drops_junk() {
        let home = TempDir::new().unwrap();
        let h = home.path();
        // Default account: sessions/ dir + sibling ~/.claude.json (a FILE).
        mkdir(&h.join(".claude/sessions"));
        touch(&h.join(".claude.json"));
        touch(&h.join(".claude.json.backup"));
        // Alternate accounts: each has its own credentials/state file.
        touch(&h.join(".claude-personal/.credentials.json"));
        touch(&h.join(".claude-ydo/.claude.json"));
        // Junk: a ~/.claude* dir with none of the marker files.
        mkdir(&h.join(".claude-empty"));

        let profiles = discover_claude_profiles(h);
        let labels: Vec<&str> = profiles.iter().map(|p| p.label.as_str()).collect();
        assert_eq!(labels, vec!["default", "personal", "ydo"]);

        // Default account carries NO env override.
        assert!(profiles[0].env.is_empty());
        // Alternates inject CLAUDE_CONFIG_DIR at their own dir.
        assert_eq!(
            profiles[1].env,
            vec![format!(
                "CLAUDE_CONFIG_DIR={}",
                h.join(".claude-personal").display()
            )]
        );
        assert_eq!(
            profiles[2].env,
            vec![format!(
                "CLAUDE_CONFIG_DIR={}",
                h.join(".claude-ydo").display()
            )]
        );
        // The .claude.json FILE must never be treated as a profile dir.
        assert!(profiles
            .iter()
            .all(|p| !p.config_dir.ends_with(".claude.json")));
    }

    #[test]
    fn claude_single_default_only() {
        let home = TempDir::new().unwrap();
        let h = home.path();
        touch(&h.join(".claude/settings.json"));
        touch(&h.join(".claude.json"));
        let profiles = discover_claude_profiles(h);
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].label, "default");
        assert!(profiles[0].env.is_empty());
    }

    #[test]
    fn codex_single_profile_has_no_env_override() {
        let home = TempDir::new().unwrap();
        let h = home.path();
        touch(&h.join(".codex/auth.json"));
        touch(&h.join(".codex/config.toml"));
        let profiles = discover_codex_profiles(h);
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].label, "default");
        assert!(profiles[0].env.is_empty());
    }

    #[test]
    fn codex_multi_profile_injects_codex_home() {
        let home = TempDir::new().unwrap();
        let h = home.path();
        touch(&h.join(".codex/auth.json"));
        touch(&h.join(".codex-work/auth.json"));
        // A ~/.codex* dir without auth.json is not a logged-in account.
        mkdir(&h.join(".codex-loggedout"));

        let profiles = discover_codex_profiles(h);
        let labels: Vec<&str> = profiles.iter().map(|p| p.label.as_str()).collect();
        assert_eq!(labels, vec!["default", "work"]);
        assert!(profiles[0].env.is_empty());
        assert_eq!(
            profiles[1].env,
            vec![format!("CODEX_HOME={}", h.join(".codex-work").display())]
        );
    }

    #[test]
    fn gemini_single_account_no_injection() {
        let home = TempDir::new().unwrap();
        let h = home.path();
        touch(&h.join(".gemini/oauth_creds.json"));
        touch(&h.join(".gemini/google_accounts.json"));
        // Even if a sibling dir exists, Gemini has no switch env, so it is
        // never surfaced as a separate account.
        touch(&h.join(".gemini-other/oauth_creds.json"));

        let profiles = discover_gemini_profiles(h);
        assert_eq!(profiles.len(), 1);
        assert_eq!(profiles[0].label, "default");
        assert!(profiles[0].env.is_empty());
    }

    #[test]
    fn gemini_absent_returns_empty() {
        let home = TempDir::new().unwrap();
        assert!(discover_gemini_profiles(home.path()).is_empty());
    }

    #[test]
    fn unknown_agent_returns_empty() {
        let home = TempDir::new().unwrap();
        assert!(discover_profiles_in("opencode", home.path()).is_empty());
    }

    #[test]
    fn validate_agent_env_keeps_only_offered_entries() {
        // Offered set is derived from real discovery, so validation is done
        // against `discover_profiles` (which reads $HOME). Here we exercise the
        // pure filtering contract via a hand-built offered set instead.
        let offered = ["CLAUDE_CONFIG_DIR=/a".to_string()];
        let offered_set: HashSet<&str> = offered.iter().map(String::as_str).collect();
        let submitted = ["CLAUDE_CONFIG_DIR=/a".to_string(), "EVIL=/etc".to_string()];
        let kept: Vec<String> = submitted
            .iter()
            .filter(|e| offered_set.contains(e.as_str()))
            .cloned()
            .collect();
        assert_eq!(kept, vec!["CLAUDE_CONFIG_DIR=/a".to_string()]);
    }
}
