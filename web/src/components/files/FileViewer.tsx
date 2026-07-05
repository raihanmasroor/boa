// Inline viewer for a produced/served session file, backed by
// `GET /api/sessions/{id}/file?path=...`. Unlike DiffFileViewer (which reviews
// changes against a base), this renders the file itself: markdown, source text,
// images, PDFs, or a download affordance for types that can't be shown inline.
//
// Auth: the dashboard's global fetch is patched to attach the token, so we
// fetch bytes → Blob → object URL and point <img>/<iframe> at the blob. A bare
// <img src>/<iframe src> to the endpoint would miss the header. SVG/HTML/XML
// are "active" types the backend force-downloads (XSS guard); we never render
// them inline and offer open-in-new-tab / download instead.

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, Download, ExternalLink, FileWarning } from "lucide-react";

import { fileKindFor, sessionFileUrl, type FileKind } from "../../lib/fileKind";
import { openArtifactInNewTab } from "../../lib/artifacts";
import { Markdown } from "../acp/Markdown";
import { FullFileViewer } from "../diff/FullFileViewer";

interface Props {
  sessionId: string;
  /** Path passed to the endpoint: an absolute host path inside the session's
   *  project_path, or a path relative to it (the file-index entries are). */
  path: string;
  /** Optional friendlier path to show in the header (e.g. repo-relative). */
  displayPath?: string;
  /** Return to the agent/terminal view. */
  onClose?: () => void;
}

type LoadState =
  | { status: "loading" }
  | { status: "error"; code?: number; message: string }
  | { status: "text"; kind: "markdown" | "text"; text: string }
  | { status: "image"; objectUrl: string }
  | { status: "pdf"; objectUrl: string }
  | { status: "download"; reason: "active" | "binary" };

/** Human label for the header path. */
function headerPath(displayPath: string | undefined, path: string): string {
  const p = displayPath ?? path;
  return p.replace(/\\/g, "/");
}

export function FileViewer({ sessionId, path, displayPath, onClose }: Props) {
  const url = useMemo(() => sessionFileUrl(sessionId, path), [sessionId, path]);
  const extKind = useMemo<FileKind>(() => fileKindFor(path), [path]);
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    // Active types (svg/html/xml) are download-only and known from the
    // extension alone — skip the fetch and show the download affordance.
    if (extKind === "download") {
      setState({ status: "download", reason: "active" });
      return;
    }

    let cancelled = false;
    let created: string | null = null;
    setState({ status: "loading" });

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          if (cancelled) return;
          setState({
            status: "error",
            code: res.status,
            message: describeHttpError(res.status),
          });
          return;
        }
        const mime = res.headers.get("content-type") ?? undefined;
        // The backend downgrades active types to octet-stream + attachment;
        // resolve the true renderer from the extension, then the mime.
        const resolved: FileKind = extKind !== "unknown" ? extKind : fileKindFor(path, mime);

        if (resolved === "markdown" || resolved === "text") {
          const text = await res.text();
          if (cancelled) return;
          setState({ status: "text", kind: resolved, text });
          return;
        }
        if (resolved === "image" || resolved === "pdf") {
          const blob = await res.blob();
          if (cancelled) return;
          created = URL.createObjectURL(blob);
          setState({ status: resolved, objectUrl: created });
          return;
        }
        // download / still-unknown: cannot preview inline.
        if (cancelled) return;
        setState({ status: "download", reason: "binary" });
      } catch {
        if (!cancelled) {
          setState({ status: "error", message: "Could not load this file." });
        }
      }
    })();

    return () => {
      cancelled = true;
      if (created) URL.revokeObjectURL(created);
    };
  }, [url, extKind, path]);

  const openInNewTab = useCallback(() => {
    void openArtifactInNewTab(url);
  }, [url]);

  const download = useCallback(() => {
    void downloadSessionFile(sessionId, path);
  }, [sessionId, path]);

  const title = headerPath(displayPath, path);

  return (
    <div className="flex-1 flex flex-col bg-surface-900 overflow-hidden">
      <div className="px-3 py-2 border-b border-surface-700/20 flex items-center gap-2 shrink-0 flex-wrap">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-text-dim hover:text-text-secondary cursor-pointer transition-colors flex items-center gap-1 text-[11px]"
            title="Back to agent"
            aria-label="Back to agent"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        <span className="font-mono text-[12px] text-text-primary truncate" title={title}>
          {title}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={openInNewTab}
            title="Open in new tab"
            aria-label="Open in new tab"
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-text-dim hover:text-text-secondary hover:bg-surface-800 cursor-pointer transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Open</span>
          </button>
          <button
            type="button"
            onClick={download}
            title="Download"
            aria-label="Download"
            className="flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-text-dim hover:text-text-secondary hover:bg-surface-800 cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <FileBody state={state} title={title} onOpenInNewTab={openInNewTab} onDownload={download} />
      </div>
    </div>
  );
}

function FileBody({
  state,
  title,
  onOpenInNewTab,
  onDownload,
}: {
  state: LoadState;
  title: string;
  onOpenInNewTab: () => void;
  onDownload: () => void;
}) {
  if (state.status === "loading") {
    return (
      <div className="flex-1 flex items-center justify-center text-text-dim">
        <span className="text-sm">Loading file…</span>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex-1 flex items-center justify-center text-status-error">
        <div className="text-center px-4">
          <p className="text-sm">{state.message}</p>
          {state.code != null && <p className="text-xs mt-1 text-text-dim">HTTP {state.code}</p>}
        </div>
      </div>
    );
  }
  if (state.status === "text") {
    if (state.kind === "markdown") {
      return (
        <div className="flex-1 min-h-0 overflow-auto px-4 py-3">
          <Markdown text={state.text} />
        </div>
      );
    }
    return <FullFileViewer content={state.text} filePath={title} />;
  }
  if (state.status === "image") {
    return (
      <div className="flex-1 min-h-0 overflow-auto flex items-center justify-center p-4">
        <img
          src={state.objectUrl}
          alt={title}
          className="max-w-full max-h-full object-contain"
          style={{ imageRendering: "auto" }}
        />
      </div>
    );
  }
  if (state.status === "pdf") {
    return <iframe src={state.objectUrl} title={title} className="flex-1 min-h-0 w-full border-0 bg-surface-950" />;
  }
  // download
  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="max-w-sm text-center">
        <FileWarning className="h-8 w-8 mx-auto text-text-dim" />
        <p className="mt-3 text-sm text-text-primary">Preview not available</p>
        <p className="mt-1 text-xs text-text-dim">
          {state.reason === "active"
            ? "This file type is downloaded rather than shown inline, to keep active content from running in the dashboard."
            : "This file can't be previewed inline. Open it in a new tab or download it instead."}
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={onOpenInNewTab}
            className="flex items-center gap-1.5 rounded-md border border-surface-700 px-3 py-1.5 text-xs text-text-secondary hover:bg-surface-800 cursor-pointer transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in new tab
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="flex items-center gap-1.5 rounded-md bg-brand-600 px-3 py-1.5 text-xs text-white hover:bg-brand-600/90 cursor-pointer transition-colors"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </button>
        </div>
      </div>
    </div>
  );
}

function describeHttpError(code: number): string {
  if (code === 404) return "File not found.";
  if (code === 413) return "File is too large to preview (over 50 MiB).";
  if (code === 401 || code === 403) return "You don't have access to this file.";
  return "Could not load this file.";
}

/** Force-download the file through the authed fetch (a bare anchor would miss
 *  the token). Uses `download=true` so any type comes back as an attachment. */
async function downloadSessionFile(sessionId: string, path: string): Promise<void> {
  try {
    const res = await fetch(sessionFileUrl(sessionId, path, true));
    if (!res.ok) return;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = path.replace(/\\/g, "/").split("/").pop() || "download";
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Revoke after the click has a chance to start the download.
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    // Non-destructive: a failed download surfaces nothing to recover.
  }
}
