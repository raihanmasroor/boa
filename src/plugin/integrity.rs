//! Deterministic content hashing of a plugin tree.
//!
//! The grant store pins what the user APPROVED (the manifest hash); the
//! tree hash pins what is actually INSTALLED. It covers every file the
//! install copies (`.git` excluded, matching `copy_plugin_tree`), so a
//! code-only change that leaves the manifest untouched still produces a
//! different hash. The featured index pins releases to this hash, and
//! `aoe plugin update` uses it to tell "up to date" from "same manifest,
//! different code".

use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use sha2::{Digest, Sha256};
use unicode_normalization::UnicodeNormalization;

/// sha256 over the plugin tree: for each file, the `/`-separated relative
/// path, a NUL, the length, and the bytes, in sorted path order.
/// `sha256:<hex>` like every other hash in the plugin system.
pub fn tree_hash(root: &Path) -> Result<String> {
    let mut files: Vec<(String, PathBuf)> = Vec::new();
    collect(root, root, &mut files)?;
    files.sort();
    let mut hasher = Sha256::new();
    for (rel, path) in files {
        let bytes = read_nofollow(&path).with_context(|| format!("hashing {}", path.display()))?;
        hasher.update(rel.as_bytes());
        hasher.update([0u8]);
        hasher.update((bytes.len() as u64).to_le_bytes());
        hasher.update(&bytes);
    }
    Ok(format!(
        "sha256:{}",
        super::grants::hex_encode(&hasher.finalize())
    ))
}

/// Reject symlinks and non-regular files (FIFO / socket / device) in a plugin
/// tree, returning whether the entry is a directory to recurse into. The
/// `is_symlink()` check MUST come first: `is_dir()` / `is_file()` follow
/// symlinks, so a `link -> /dev/zero` or `link -> /etc/passwd` would otherwise
/// be enrolled as a regular file and read through, hanging the install or
/// exfiltrating host content into the tree hash. Shared with
/// `install::copy_plugin_tree` so the hash domain and the copied tree agree.
pub(crate) fn dir_or_reject(ft: &std::fs::FileType, path: &Path) -> Result<bool> {
    if ft.is_symlink() {
        anyhow::bail!(
            "plugin tree contains a symlink: {} (symlinks are not allowed)",
            path.display()
        );
    }
    if ft.is_dir() {
        return Ok(true);
    }
    if ft.is_file() {
        return Ok(false);
    }
    anyhow::bail!(
        "plugin tree contains a non-regular file: {}",
        path.display()
    );
}

/// Read a file without following a final symlink. `dir_or_reject`'s
/// `is_symlink()` check is `lstat`-based and a separate syscall from the read,
/// so a same-uid process could swap a regular file for a symlink to a host
/// secret in between (TOCTOU). `O_NOFOLLOW` makes the open itself fail
/// (`ELOOP`) on a symlinked final component, closing the race.
#[cfg(unix)]
pub(crate) fn read_nofollow(path: &Path) -> Result<Vec<u8>> {
    use std::io::Read;
    use std::os::unix::fs::OpenOptionsExt;
    let mut f = std::fs::OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NOFOLLOW)
        .open(path)
        .with_context(|| format!("opening {} without following symlinks", path.display()))?;
    let mut buf = Vec::new();
    f.read_to_end(&mut buf)?;
    Ok(buf)
}

/// Windows: creating symlinks is a privileged operation and there is no
/// `O_NOFOLLOW` equivalent; the `lstat`-based `dir_or_reject` check already
/// rejects symlinks, so a plain read is the best available.
#[cfg(not(unix))]
pub(crate) fn read_nofollow(path: &Path) -> Result<Vec<u8>> {
    Ok(std::fs::read(path)?)
}

/// Copy a regular file without following a final symlink on the source,
/// preserving its mode (the worker entrypoint relies on its executable bit).
/// Same TOCTOU reasoning as [`read_nofollow`].
#[cfg(unix)]
pub(crate) fn copy_file_nofollow(from: &Path, to: &Path) -> Result<()> {
    use std::os::unix::fs::{OpenOptionsExt, PermissionsExt};
    let mut src = std::fs::OpenOptions::new()
        .read(true)
        .custom_flags(libc::O_NOFOLLOW)
        .open(from)
        .with_context(|| format!("opening {} without following symlinks", from.display()))?;
    let mode = src.metadata()?.permissions().mode();
    let mut dst = std::fs::File::create(to)?;
    std::io::copy(&mut src, &mut dst)?;
    dst.set_permissions(std::fs::Permissions::from_mode(mode))?;
    Ok(())
}

#[cfg(not(unix))]
pub(crate) fn copy_file_nofollow(from: &Path, to: &Path) -> Result<()> {
    std::fs::copy(from, to)?;
    Ok(())
}

fn collect(root: &Path, dir: &Path, files: &mut Vec<(String, PathBuf)>) -> Result<()> {
    for entry in std::fs::read_dir(dir).with_context(|| format!("reading {}", dir.display()))? {
        let entry = entry?;
        let name = entry.file_name();
        if name == ".git" {
            continue;
        }
        let path = entry.path();
        if dir_or_reject(&entry.file_type()?, &path)? {
            collect(root, &path, files)?;
        } else {
            // Require valid UTF-8 per component: to_string_lossy() would map
            // invalid bytes to U+FFFD and could collapse distinct names onto
            // the same hash path, making the pin ambiguous.
            let rel = path
                .strip_prefix(root)
                .expect("entry is under root")
                .components()
                .map(|c| {
                    c.as_os_str().to_str().map(str::to_string).ok_or_else(|| {
                        anyhow::anyhow!("plugin path is not valid UTF-8: {}", path.display())
                    })
                })
                .collect::<Result<Vec<_>>>()?
                .join("/");
            // NFC-normalize so a name stored decomposed (APFS/HFS+) and the
            // same name stored composed (ext4/btrfs) hash identically; the
            // featured pins in `featured.rs` are a cross-platform contract.
            let rel = rel.nfc().collect::<String>();
            // Two distinct on-disk names can normalize to the same rel (e.g. a
            // tree carrying both the composed and decomposed form); that makes
            // the hash ambiguous, so refuse rather than silently pick one.
            if files.iter().any(|(existing, _)| existing == &rel) {
                anyhow::bail!("plugin tree contains a duplicate normalized path: {rel}");
            }
            files.push((rel, path));
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn write(dir: &Path, rel: &str, contents: &str) {
        let path = dir.join(rel);
        std::fs::create_dir_all(path.parent().unwrap()).unwrap();
        std::fs::write(path, contents).unwrap();
    }

    #[test]
    fn hash_is_stable_and_ignores_git_dir() {
        let a = tempfile::tempdir().unwrap();
        write(a.path(), "aoe-plugin.toml", "id = \"x\"");
        write(a.path(), "themes/dark.toml", "bg = \"#000\"");
        let b = tempfile::tempdir().unwrap();
        write(b.path(), "aoe-plugin.toml", "id = \"x\"");
        write(b.path(), "themes/dark.toml", "bg = \"#000\"");
        write(b.path(), ".git/HEAD", "ref: refs/heads/main");

        let ha = tree_hash(a.path()).unwrap();
        assert!(ha.starts_with("sha256:"));
        assert_eq!(ha, tree_hash(b.path()).unwrap());
    }

    #[test]
    fn code_change_without_manifest_change_alters_hash() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), "aoe-plugin.toml", "id = \"x\"");
        write(dir.path(), "bin/worker", "v1");
        let before = tree_hash(dir.path()).unwrap();
        write(dir.path(), "bin/worker", "v2");
        assert_ne!(before, tree_hash(dir.path()).unwrap());
    }

    #[cfg(unix)]
    #[test]
    fn precomposed_and_decomposed_names_hash_equal() {
        // "café": precomposed é (U+00E9) vs decomposed e + U+0301. On a
        // byte-preserving fs (ext4/btrfs) these are two distinct on-disk
        // names; NFC normalization must collapse them to the same hash.
        let a = tempfile::tempdir().unwrap();
        write(a.path(), "caf\u{e9}.txt", "x");
        let b = tempfile::tempdir().unwrap();
        write(b.path(), "cafe\u{301}.txt", "x");
        assert_eq!(tree_hash(a.path()).unwrap(), tree_hash(b.path()).unwrap());
    }

    #[cfg(unix)]
    #[test]
    fn symlink_in_tree_is_rejected_not_followed() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), "aoe-plugin.toml", "id = \"x\"");
        std::os::unix::fs::symlink("/etc/passwd", dir.path().join("evil-link")).unwrap();
        let err = tree_hash(dir.path()).unwrap_err();
        assert!(err.to_string().contains("symlink"), "got: {err}");
    }

    #[test]
    fn renaming_a_file_alters_hash_even_with_same_bytes() {
        let dir = tempfile::tempdir().unwrap();
        write(dir.path(), "a.txt", "same");
        let before = tree_hash(dir.path()).unwrap();
        std::fs::rename(dir.path().join("a.txt"), dir.path().join("b.txt")).unwrap();
        assert_ne!(before, tree_hash(dir.path()).unwrap());
    }
}
