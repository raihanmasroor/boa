//! Auto-provision missing ACP adapter binaries at `aoe serve` startup.
//!
//! BOA divergence from upstream (agent-of-empires): upstream ships the
//! structured (ACP) view but leaves adapter installation to the user. On a
//! fresh box `claude-agent-acp`, `codex-acp`, and the `gemini` CLI are each
//! missing until the user hand-runs `npm install -g ...` (or `aoe acp doctor
//! --fix`, or the web "Update & restart" action), so every ACP agent renders
//! a "binary not found" error out of the box.
//!
//! This module closes that gap: at daemon startup BOA probes PATH for each
//! provisionable adapter and, for any that is missing AND has an
//! `npm_package_for` mapping, runs `npm install -g <pkg>` once, serialized, in
//! the background. It is strictly best-effort — every failure is logged and
//! skipped, and the existing manual install hints remain the fallback — so it
//! never blocks or breaks `aoe serve`.
//!
//! The registry deliberately avoids `npx -y` when *spawning* adapters (a
//! first-run download can hang a worker mid-handshake; see
//! `agent_registry::with_defaults`), but that objection does not apply here:
//! provisioning runs off the hot path, before any worker spawns, and a slow or
//! failed install just leaves the adapter missing — exactly the prior state.

use crate::acp::install_hints::npm_package_for;

/// The adapter binaries BOA tries to provision at serve startup. Each must
/// have an `npm_package_for` entry to be eligible; anything else is skipped
/// and left to its manual install hint. `gemini` is the native CLI (spawned
/// as `gemini --acp`); the other two are ACP adapters.
pub const PROVISION_BINARIES: &[&str] = &["claude-agent-acp", "codex-acp", "gemini"];

/// What happened for a single binary. Returned (rather than only logged) so
/// unit tests can assert the exact decision path without a tracing subscriber.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProvisionOutcome {
    /// Already on PATH; nothing to do.
    AlreadyPresent,
    /// No `npm_package_for` mapping (curl|bash / manual agent); skipped.
    NotInstallable,
    /// `npm install -g <package>` ran and succeeded.
    Installed(String),
    /// `npm install -g <package>` ran and failed. Non-fatal.
    InstallFailed(String),
}

/// Provision `binaries` using injected closures so the decision logic is
/// unit-testable without touching the real PATH or running npm.
///
/// - `binary_exists` probes PATH for a binary name.
/// - `install` runs `npm install -g <package>` for `(binary, package)` and
///   returns `Ok(())` on success or `Err(detail)` on failure.
///
/// Installs run one at a time, in list order — never concurrently — because
/// `npm install -g` mutates the shared global prefix and parallel runs race.
/// A failing install is logged and skipped; the remaining binaries are still
/// attempted. When `npm_available` is false, nothing is probed or installed:
/// one line is logged and the run is skipped, since the structured view needs
/// Node/npm regardless.
pub fn provision_with<E, I>(
    binaries: &[&str],
    npm_available: bool,
    mut binary_exists: E,
    mut install: I,
) -> Vec<(String, ProvisionOutcome)>
where
    E: FnMut(&str) -> bool,
    I: FnMut(&str, &str) -> Result<(), String>,
{
    if !npm_available {
        tracing::info!(
            target: "acp.auto_provision",
            "npm not found on PATH; skipping ACP adapter auto-provision \
             (the structured view needs Node.js + npm — install them, then restart `aoe serve`)"
        );
        return Vec::new();
    }

    let mut results = Vec::with_capacity(binaries.len());
    for &binary in binaries {
        let outcome = provision_one(binary, &mut binary_exists, &mut install);
        results.push((binary.to_string(), outcome));
    }
    results
}

fn provision_one<E, I>(binary: &str, binary_exists: &mut E, install: &mut I) -> ProvisionOutcome
where
    E: FnMut(&str) -> bool,
    I: FnMut(&str, &str) -> Result<(), String>,
{
    if binary_exists(binary) {
        tracing::debug!(target: "acp.auto_provision", binary, "already on PATH; skipping");
        return ProvisionOutcome::AlreadyPresent;
    }
    let Some(package) = npm_package_for(binary) else {
        tracing::debug!(
            target: "acp.auto_provision",
            binary,
            "no npm package mapping; leaving to the manual install hint"
        );
        return ProvisionOutcome::NotInstallable;
    };

    tracing::info!(
        target: "acp.auto_provision",
        binary,
        package,
        "adapter missing — running `npm install -g`"
    );
    match install(binary, package) {
        Ok(()) => {
            tracing::info!(target: "acp.auto_provision", binary, package, "installed adapter");
            ProvisionOutcome::Installed(package.to_string())
        }
        Err(detail) => {
            tracing::warn!(
                target: "acp.auto_provision",
                binary,
                package,
                error = %detail,
                "auto-install failed (non-fatal); the manual install hint still applies"
            );
            ProvisionOutcome::InstallFailed(package.to_string())
        }
    }
}

/// Real PATH probe: mirrors how the registry and doctor test binary presence.
fn binary_on_path(binary: &str) -> bool {
    which::which(binary).is_ok()
}

/// Run `npm install -g <package>` with fixed argv and no shell. Returns the
/// last non-empty stderr line on a non-zero exit so the caller can log why.
fn npm_install_global(npm: &std::path::Path, package: &str) -> Result<(), String> {
    let output = std::process::Command::new(npm)
        .args(["install", "-g", package])
        .output()
        .map_err(|e| format!("failed to start npm: {e}"))?;
    if output.status.success() {
        return Ok(());
    }
    let stderr = String::from_utf8_lossy(&output.stderr);
    let last_line = stderr
        .lines()
        .rev()
        .find(|l| !l.trim().is_empty())
        .unwrap_or("")
        .trim();
    Err(format!("npm exited with {}: {last_line}", output.status))
}

/// Startup entry point: resolve npm, then provision `binaries` sequentially.
/// Best-effort and self-contained, safe to call from a background task. This
/// is blocking (uses `std::process`), so an async caller must wrap it in
/// `spawn_blocking`.
pub fn run_startup_provision(binaries: &[&str]) {
    let npm = which::which("npm").ok();
    let results = provision_with(
        binaries,
        npm.is_some(),
        binary_on_path,
        |_binary, package| match npm.as_deref() {
            Some(npm) => npm_install_global(npm, package),
            // Unreachable: `provision_with` only calls `install` when
            // `npm.is_some()`. Guard defensively rather than panic.
            None => Err("npm path unexpectedly missing".to_string()),
        },
    );

    let installed = results
        .iter()
        .filter(|(_, o)| matches!(o, ProvisionOutcome::Installed(_)))
        .count();
    let failed = results
        .iter()
        .filter(|(_, o)| matches!(o, ProvisionOutcome::InstallFailed(_)))
        .count();
    if installed > 0 || failed > 0 {
        tracing::info!(
            target: "acp.auto_provision",
            installed,
            failed,
            "ACP adapter auto-provision complete"
        );
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::cell::RefCell;

    /// Records every `(binary, package)` the installer closure is asked to run
    /// so tests can assert exact argv without touching the real npm.
    #[derive(Default)]
    struct InstallRecorder {
        calls: RefCell<Vec<(String, String)>>,
    }

    impl InstallRecorder {
        fn calls(&self) -> Vec<(String, String)> {
            self.calls.borrow().clone()
        }
    }

    #[test]
    fn missing_binary_is_installed_with_the_right_package() {
        let rec = InstallRecorder::default();
        let out = provision_with(
            &["claude-agent-acp"],
            true,
            |_| false, // nothing on PATH
            |binary, package| {
                rec.calls
                    .borrow_mut()
                    .push((binary.to_string(), package.to_string()));
                Ok(())
            },
        );
        assert_eq!(
            out,
            vec![(
                "claude-agent-acp".to_string(),
                ProvisionOutcome::Installed("@agentclientprotocol/claude-agent-acp@latest".into())
            )]
        );
        assert_eq!(
            rec.calls(),
            vec![(
                "claude-agent-acp".to_string(),
                "@agentclientprotocol/claude-agent-acp@latest".to_string()
            )],
            "installer must be invoked with the npm_package_for mapping"
        );
    }

    #[test]
    fn present_binary_is_skipped_and_never_installed() {
        let rec = InstallRecorder::default();
        let out = provision_with(
            &["codex-acp"],
            true,
            |_| true, // already on PATH
            |binary, package| {
                rec.calls
                    .borrow_mut()
                    .push((binary.to_string(), package.to_string()));
                Ok(())
            },
        );
        assert_eq!(
            out,
            vec![("codex-acp".to_string(), ProvisionOutcome::AlreadyPresent)]
        );
        assert!(
            rec.calls().is_empty(),
            "a present binary must not trigger an install"
        );
    }

    #[test]
    fn npm_missing_skips_gracefully_without_probing_or_installing() {
        let rec = InstallRecorder::default();
        let probed = RefCell::new(0usize);
        let out = provision_with(
            PROVISION_BINARIES,
            false, // npm not available
            |_| {
                *probed.borrow_mut() += 1;
                false
            },
            |binary, package| {
                rec.calls
                    .borrow_mut()
                    .push((binary.to_string(), package.to_string()));
                Ok(())
            },
        );
        assert!(out.is_empty(), "npm-missing run reports no outcomes");
        assert_eq!(*probed.borrow(), 0, "npm-missing must not even probe PATH");
        assert!(rec.calls().is_empty(), "npm-missing must not install");
    }

    #[test]
    fn install_failure_is_non_fatal_and_others_still_attempted() {
        let rec = InstallRecorder::default();
        // All three default binaries are missing; the first install fails.
        let out = provision_with(
            PROVISION_BINARIES,
            true,
            |_| false,
            |binary, package| {
                rec.calls
                    .borrow_mut()
                    .push((binary.to_string(), package.to_string()));
                if binary == "claude-agent-acp" {
                    Err("boom".to_string())
                } else {
                    Ok(())
                }
            },
        );
        assert_eq!(
            out,
            vec![
                (
                    "claude-agent-acp".to_string(),
                    ProvisionOutcome::InstallFailed(
                        "@agentclientprotocol/claude-agent-acp@latest".into()
                    )
                ),
                (
                    "codex-acp".to_string(),
                    ProvisionOutcome::Installed("@agentclientprotocol/codex-acp@latest".into())
                ),
                (
                    "gemini".to_string(),
                    ProvisionOutcome::Installed("@google/gemini-cli".into())
                ),
            ]
        );
        // A failure on the first entry must not abort the rest: all three
        // were attempted, in list order (serialized).
        assert_eq!(
            rec.calls(),
            vec![
                (
                    "claude-agent-acp".to_string(),
                    "@agentclientprotocol/claude-agent-acp@latest".to_string()
                ),
                (
                    "codex-acp".to_string(),
                    "@agentclientprotocol/codex-acp@latest".to_string()
                ),
                ("gemini".to_string(), "@google/gemini-cli".to_string()),
            ]
        );
    }

    /// End-to-end smoke over the REAL installer (`npm_install_global` →
    /// `std::process::Command` → a fake `npm` shim) with no global PATH
    /// mutation: the shim path is passed directly, so this is race-free with
    /// the parallel test runner. Proves the exact argv BOA would run for a
    /// missing adapter and that a present one is never installed.
    #[cfg(unix)]
    #[test]
    fn smoke_real_installer_emits_npm_argv_and_skips_present() {
        use std::os::unix::fs::PermissionsExt;

        let dir = std::env::temp_dir().join(format!("boa-autoprov-smoke-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        let log = dir.join("npm-argv.log");
        let npm = dir.join("npm");
        // Fake npm: append the space-joined argv (one invocation per line) to
        // the log, then exit success.
        std::fs::write(
            &npm,
            format!(
                "#!/bin/sh\nprintf '%s ' \"$@\" >> '{log}'\nprintf '\\n' >> '{log}'\nexit 0\n",
                log = log.display()
            ),
        )
        .unwrap();
        let mut perms = std::fs::metadata(&npm).unwrap().permissions();
        perms.set_mode(0o755);
        std::fs::set_permissions(&npm, perms).unwrap();

        // claude-agent-acp is "missing" → installs; gemini is "present" → skips.
        let present = ["gemini"];
        let out = provision_with(
            &["claude-agent-acp", "gemini"],
            true,
            |b| present.contains(&b),
            |_binary, package| npm_install_global(&npm, package),
        );

        assert_eq!(
            out,
            vec![
                (
                    "claude-agent-acp".to_string(),
                    ProvisionOutcome::Installed(
                        "@agentclientprotocol/claude-agent-acp@latest".into()
                    )
                ),
                ("gemini".to_string(), ProvisionOutcome::AlreadyPresent),
            ]
        );

        let logged = std::fs::read_to_string(&log).unwrap();
        // Print the raw argv log so `--nocapture` yields the smoke evidence.
        eprintln!("FAKE-NPM-ARGV-LOG:\n{logged}");
        assert!(
            logged.contains("install -g @agentclientprotocol/claude-agent-acp@latest"),
            "fake npm must have been invoked with the install argv; got: {logged:?}"
        );
        assert!(
            !logged.contains("@google/gemini-cli"),
            "the present binary must never be installed; got: {logged:?}"
        );

        let _ = std::fs::remove_dir_all(&dir);
    }

    #[test]
    fn non_npm_binary_is_skipped_not_installed() {
        let rec = InstallRecorder::default();
        // `opencode` is a real registry binary but installs via curl|bash, so
        // it has no npm_package_for entry and must be left to its hint.
        let out = provision_with(
            &["opencode"],
            true,
            |_| false,
            |binary, package| {
                rec.calls
                    .borrow_mut()
                    .push((binary.to_string(), package.to_string()));
                Ok(())
            },
        );
        assert_eq!(
            out,
            vec![("opencode".to_string(), ProvisionOutcome::NotInstallable)]
        );
        assert!(
            rec.calls().is_empty(),
            "a non-npm agent must not be installed via npm"
        );
    }
}
