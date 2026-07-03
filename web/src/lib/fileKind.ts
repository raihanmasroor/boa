// Classify a produced/served file into the renderer the FileViewer should use.
// The new `GET /api/sessions/{id}/file` endpoint returns raw bytes; the viewer
// picks a renderer by file extension (fast, no fetch needed) and falls back to
// the response's Content-Type for extensionless / unknown files.
//
// SECURITY: the backend always returns "active" types (text/html,
// application/xhtml+xml, image/svg+xml, application/xml, text/xml) as
// `application/octet-stream` + attachment disposition, so they can never be
// rendered inline. We mirror that here by classifying those extensions as
// "download" — the viewer offers open-in-new-tab / download instead of an
// inline render (which would be an XSS vector). See the endpoint contract.

/** Which renderer the FileViewer should mount for a file.
 *  - `markdown` → fetch text, render with <Markdown>
 *  - `text`     → fetch text, render with <FullFileViewer> (shiki)
 *  - `image`    → authed blob → <img>
 *  - `pdf`      → authed blob → <iframe>
 *  - `download` → cannot preview inline; offer open-in-new-tab / download
 *  - `unknown`  → extension gave no signal; resolve from the response mime */
export type FileKind = "markdown" | "text" | "image" | "pdf" | "download" | "unknown";

const MARKDOWN_EXTS = new Set(["md", "markdown", "mdown", "mkd"]);

// Raster/vector-free image formats that render safely in an <img>. SVG is
// intentionally absent: it is an active type the backend force-downloads.
const IMAGE_EXTS = new Set(["png", "jpg", "jpeg", "gif", "webp", "avif", "bmp", "ico", "apng"]);

// Active / script-capable types the backend always sends as an attachment.
// Rendering any of these inline (even via a blob URL) can execute script, so
// they are download-only here regardless of the fetched Content-Type.
const DOWNLOAD_EXTS = new Set(["svg", "svgz", "html", "htm", "xhtml", "xht", "xml", "xsl", "xslt"]);

// Broad set of text / source extensions we can safely syntax-highlight or show
// as plain text. Kept generous: anything missing still resolves via mime.
const TEXT_EXTS = new Set([
  "ts", "tsx", "js", "jsx", "mjs", "cjs", "mts", "cts",
  "json", "jsonc", "json5", "ndjson",
  "py", "pyi", "rb", "rs", "go", "java", "kt", "kts", "swift",
  "c", "h", "cc", "cpp", "cxx", "hpp", "hh", "cs",
  "php", "pl", "pm", "lua", "sh", "bash", "zsh", "fish", "bat", "cmd", "ps1",
  "toml", "yaml", "yml", "ini", "cfg", "conf", "properties", "env",
  "sql", "proto", "graphql", "gql",
  "txt", "text", "log", "csv", "tsv",
  "r", "jl", "ex", "exs", "erl", "hrl", "hs", "scala", "sc", "clj", "cljs", "edn",
  "vue", "svelte", "astro",
  "diff", "patch", "gradle", "groovy", "dart", "elm", "nim", "zig",
  "tf", "hcl", "tfvars",
  "css", "scss", "sass", "less", "styl",
  "rst", "tex", "bib", "adoc", "org", "srt", "vtt",
]);

// Extensionless files whose basename identifies a text/source file.
const TEXT_BASENAMES = new Set([
  "dockerfile", "makefile", "gnumakefile", "cmakelists.txt",
  "gitignore", "gitattributes", "editorconfig", "npmrc", "nvmrc",
  "prettierrc", "eslintrc", "babelrc", "license", "readme", "authors",
  "changelog", "notice", "procfile",
]);

/** Lowercased final path segment (basename). */
function basenameOf(path: string): string {
  const norm = path.replace(/\\/g, "/");
  const trimmed = norm.replace(/\/+$/, "");
  const seg = trimmed.slice(trimmed.lastIndexOf("/") + 1);
  return seg.toLowerCase();
}

/** Lowercased extension without the dot, or "" when there is none. Leading-dot
 *  files (`.gitignore`) have no extension in this sense — the whole name is the
 *  basename, matched separately. */
function extOf(path: string): string {
  const base = basenameOf(path);
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return ""; // no dot, or a leading-dot dotfile
  return base.slice(dot + 1);
}

/** Resolve a mime type (Content-Type value, params stripped) to a FileKind.
 *  Mirrors the backend's "active types are attachment-only" rule. */
function kindFromMime(mime: string): FileKind {
  const type = mime.split(";", 1)[0]!.trim().toLowerCase();
  if (!type) return "download";
  // Active/script-capable types: never inline.
  if (
    type === "text/html" ||
    type === "application/xhtml+xml" ||
    type === "image/svg+xml" ||
    type === "application/xml" ||
    type === "text/xml"
  ) {
    return "download";
  }
  if (type === "application/pdf") return "pdf";
  if (type.startsWith("image/")) return "image";
  if (type === "application/json") return "text";
  if (type.startsWith("text/")) return "text";
  return "download";
}

/**
 * Classify a file for the viewer. Extension wins when it is recognized; when it
 * is not (empty or unknown extension), `mime` — the fetched Content-Type — is
 * consulted. With neither signal the result is `unknown`, and the caller must
 * fetch to obtain a mime before deciding.
 */
export function fileKindFor(path: string, mime?: string): FileKind {
  const ext = extOf(path);
  if (ext) {
    if (MARKDOWN_EXTS.has(ext)) return "markdown";
    if (IMAGE_EXTS.has(ext)) return "image";
    if (ext === "pdf") return "pdf";
    if (DOWNLOAD_EXTS.has(ext)) return "download";
    if (TEXT_EXTS.has(ext)) return "text";
  } else if (TEXT_BASENAMES.has(basenameOf(path))) {
    return "text";
  }
  if (mime) return kindFromMime(mime);
  return "unknown";
}

/** Extensions the FileViewer can render inline better than the diff viewer
 *  (which shows "Binary file"). Used to route chat/tool-card path clicks for
 *  images and PDFs into the produced-file viewer instead of the diff viewer. */
export function isInlinePreviewMedia(path: string): boolean {
  const kind = fileKindFor(path);
  return kind === "image" || kind === "pdf";
}

/** Build the authenticated URL for the session file endpoint. The global fetch
 *  is patched to attach the auth header, so any `fetch(sessionFileUrl(...))`
 *  (or blob-based open) carries credentials. */
export function sessionFileUrl(sessionId: string, path: string, download = false): string {
  const params = new URLSearchParams({ path });
  if (download) params.set("download", "true");
  return `/api/sessions/${encodeURIComponent(sessionId)}/file?${params.toString()}`;
}
