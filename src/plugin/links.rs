//! Plugin terminal link handlers: a plugin declares regex patterns, and a
//! Ctrl+click (TUI) or click (web) on matching terminal text routes to a
//! plugin action. Patterns are compiled once per registry reload; an invalid
//! regex is skipped with a warning, mirroring status detection.

use std::sync::{Arc, RwLock};

use regex::Regex;
use tracing::warn;

use super::RwLockSafe;

/// One compiled link handler: a pattern and the worker method to invoke.
struct CompiledHandler {
    plugin_id: String,
    pattern: Regex,
    rpc_method: String,
}

#[derive(Default)]
struct Snapshot {
    handlers: Vec<CompiledHandler>,
}

static SNAPSHOT: RwLock<Option<Arc<Snapshot>>> = RwLock::new(None);

/// Drop the compiled snapshot; the next match rebuilds from the current
/// registry. Called by [`super::reload_registry`].
pub fn invalidate() {
    *SNAPSHOT.write_safe() = None;
}

fn build_snapshot() -> Arc<Snapshot> {
    let registry = super::registry();
    let mut handlers = Vec::new();
    for plugin in registry.active() {
        for h in &plugin.manifest.link_handlers {
            // Compiled once at snapshot build; the regex crate has no
            // backtracking, so hostile pane text cannot blow up matching.
            match Regex::new(&h.pattern) {
                Ok(pattern) => handlers.push(CompiledHandler {
                    plugin_id: plugin.id().to_string(),
                    pattern,
                    rpc_method: h.rpc_method.clone(),
                }),
                Err(e) => {
                    warn!(target: "plugin", pattern = %h.pattern, "invalid link handler regex skipped: {e}")
                }
            }
        }
    }
    Arc::new(Snapshot { handlers })
}

fn snapshot() -> Arc<Snapshot> {
    if let Some(snap) = SNAPSHOT.read_safe().as_ref() {
        return snap.clone();
    }
    let snap = build_snapshot();
    *SNAPSHOT.write_safe() = Some(snap.clone());
    snap
}

/// A link match: which plugin action to invoke and the text that matched.
pub struct LinkMatch {
    pub plugin_id: String,
    pub rpc_method: String,
    pub text: String,
}

/// The link handler whose pattern matches a span of `line` covering byte
/// offset `col`. Handlers are tried in plugin/declaration order; within a
/// handler the first match covering `col` wins.
fn find_match(handlers: &[CompiledHandler], line: &str, col: usize) -> Option<LinkMatch> {
    for h in handlers {
        for m in h.pattern.find_iter(line) {
            if m.start() <= col && col < m.end() {
                return Some(LinkMatch {
                    plugin_id: h.plugin_id.clone(),
                    rpc_method: h.rpc_method.clone(),
                    text: m.as_str().to_string(),
                });
            }
        }
    }
    None
}

/// Find an active link handler matching a span of `line` that covers `col`.
/// `None` if nothing is declared or no pattern matches under the column.
pub fn match_in_line(line: &str, col: usize) -> Option<LinkMatch> {
    find_match(&snapshot().handlers, line, col)
}

/// Whether `plugin_id` declares a link handler bound to `rpc_method`. The web
/// endpoint validates the client-supplied method against this before
/// dispatching, so a click cannot invoke an arbitrary worker method.
pub fn is_declared(plugin_id: &str, rpc_method: &str) -> bool {
    snapshot()
        .handlers
        .iter()
        .any(|h| h.plugin_id == plugin_id && h.rpc_method == rpc_method)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn handler(plugin_id: &str, pattern: &str, rpc_method: &str) -> CompiledHandler {
        CompiledHandler {
            plugin_id: plugin_id.into(),
            pattern: Regex::new(pattern).unwrap(),
            rpc_method: rpc_method.into(),
        }
    }

    #[test]
    fn matches_only_the_span_under_the_clicked_column() {
        let handlers = vec![handler("acme", r"#\d+", "open_issue")];
        let line = "see #123 and #456 here";
        // Column inside the first match.
        let m = find_match(&handlers, line, 5).unwrap();
        assert_eq!(m.text, "#123");
        assert_eq!(m.plugin_id, "acme");
        assert_eq!(m.rpc_method, "open_issue");
        // Column inside the second match returns that span.
        assert_eq!(find_match(&handlers, line, 14).unwrap().text, "#456");
        // Column outside any match: no link.
        assert!(find_match(&handlers, line, 0).is_none());
    }

    #[test]
    fn first_declared_handler_wins_on_overlap() {
        let handlers = vec![
            handler("first", r"\w+", "a"),
            handler("second", r"foo", "b"),
        ];
        let m = find_match(&handlers, "foo", 1).unwrap();
        assert_eq!(m.plugin_id, "first");
    }
}
