// Files pane: browse the produced files under a session's working dir and open
// one in the FileViewer (via the shared open-file flow). Backed by
// `useFilesIndex`, which fetches `GET /api/sessions/:id/acp/files` (relative
// POSIX paths, sorted, capped at 5000). Clicking a file routes through the same
// handler as clickable chat paths, so it lands in the main-left viewer.

import { useMemo, useState } from "react";
import { File as FileIcon, FolderTree, Search } from "lucide-react";

import { useFilesIndex } from "../acp/useFilesIndex";

interface Props {
  sessionId: string;
  /** Open a file (path relative to the session's project_path) in the viewer. */
  onOpenFile: (path: string) => void;
}

// The index endpoint caps at 5000 entries; treat a full page as "truncated"
// (the hook drops the flag, so this is the closest honest signal available).
const INDEX_CAP = 5000;
// Cap rendered rows so a huge tree doesn't mount thousands of DOM nodes; the
// filter narrows past this quickly.
const MAX_ROWS = 400;

function splitPath(path: string): { dir: string; name: string } {
  const slash = path.lastIndexOf("/");
  if (slash < 0) return { dir: "", name: path };
  return { dir: path.slice(0, slash + 1), name: path.slice(slash + 1) };
}

export function FilesPane({ sessionId, onOpenFile }: Props) {
  const { files, loading } = useFilesIndex(sessionId);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.toLowerCase().includes(q));
  }, [files, query]);

  const shown = filtered.slice(0, MAX_ROWS);
  const truncatedIndex = files.length >= INDEX_CAP;
  const truncatedRows = filtered.length > shown.length;

  return (
    <div className="flex flex-col min-h-0 h-full bg-surface-900">
      <div className="px-2 py-2 border-b border-surface-700/20 shrink-0">
        <div className="flex items-center gap-2 rounded-md border border-surface-700 bg-surface-950 px-2 py-1">
          <Search className="h-3.5 w-3.5 text-text-dim shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter files…"
            aria-label="Filter files"
            className="flex-1 min-w-0 bg-transparent text-xs text-text-primary placeholder:text-text-dim focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8 text-text-dim">
            <span className="text-xs">Loading files…</span>
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-text-dim px-4 text-center">
            <FolderTree className="h-6 w-6" />
            <span className="text-xs">No files in this session's working directory yet.</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-text-dim px-4 text-center">
            <span className="text-xs">No files match "{query}".</span>
          </div>
        ) : (
          <ul className="py-1">
            {shown.map((path) => {
              const { dir, name } = splitPath(path);
              return (
                <li key={path}>
                  <button
                    type="button"
                    onClick={() => onOpenFile(path)}
                    title={path}
                    className="w-full flex items-center gap-2 px-3 py-1 text-left hover:bg-surface-800 cursor-pointer transition-colors group"
                  >
                    <FileIcon className="h-3.5 w-3.5 text-text-dim shrink-0" />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">
                      {dir && <span className="text-text-dim">{dir}</span>}
                      <span className="text-text-primary group-hover:text-accent-600">{name}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(truncatedIndex || truncatedRows) && (
        <div className="px-3 py-1.5 border-t border-surface-700/20 shrink-0 text-[11px] text-text-dim">
          {truncatedRows
            ? `Showing ${shown.length} of ${filtered.length} matches — refine the filter to see more.`
            : `Index capped at ${INDEX_CAP} files; some may be hidden.`}
        </div>
      )}
    </div>
  );
}
