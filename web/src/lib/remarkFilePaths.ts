// Remark plugin: turn bare absolute filesystem paths in prose into link nodes
// so the transcript's anchor override (TranscriptLink in Markdown.tsx) can
// intercept them and open the in-app file viewer. Markdown *links*
// (`[x](/abs/path)`) already flow through TranscriptLink; a bare path typed in
// prose does not, which is the gap this closes.
//
// It operates on the mdast (before rendering), never the DOM. Only `text` nodes
// are visited, and we do not recurse into `link`/`linkReference` nodes, so paths
// inside existing links or code (`code`/`inlineCode` carry no child text nodes)
// are left untouched.

interface MdastNode {
  type: string;
  value?: string;
  url?: string;
  children?: MdastNode[];
  [key: string]: unknown;
}

// An absolute POSIX path with at least two segments (`/a/b`), each segment made
// of word chars plus a few path-safe punctuation marks, and an optional
// `:line` / `:line:col` suffix. Requiring two segments avoids linkifying a lone
// `/word` that appears in ordinary prose. Global + sticky-free so we can scan.
const PATH_RE = /\/(?:[A-Za-z0-9._@+-]+\/)+[A-Za-z0-9._@+-]+(?::\d+(?::\d+)?)?/g;

// Characters that may immediately precede a path start. If the char before a
// match is a word char or a slash, the match is part of a larger token (e.g. a
// URL path or `and/or`), so it is skipped.
function isBoundaryChar(ch: string | undefined): boolean {
  if (ch === undefined) return true; // start of string
  return !/[A-Za-z0-9/]/.test(ch);
}

/** Split a text value into an array of text/link mdast nodes, linkifying any
 *  bare absolute paths. Returns null when nothing matched (caller keeps the
 *  original node, avoiding needless tree churn). Exported for tests. */
export function splitTextIntoPathNodes(value: string): MdastNode[] | null {
  PATH_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  let lastIndex = 0;
  const out: MdastNode[] = [];
  let matched = false;

  while ((match = PATH_RE.exec(value)) !== null) {
    const start = match.index;
    const token = match[0];
    // Skip matches that begin mid-token (preceded by a word char or slash).
    if (!isBoundaryChar(value[start - 1])) continue;

    matched = true;
    if (start > lastIndex) {
      out.push({ type: "text", value: value.slice(lastIndex, start) });
    }
    out.push({
      type: "link",
      url: token,
      children: [{ type: "text", value: token }],
    });
    lastIndex = start + token.length;
  }

  if (!matched) return null;
  if (lastIndex < value.length) {
    out.push({ type: "text", value: value.slice(lastIndex) });
  }
  return out;
}

// Node types whose subtree must not be rewritten: existing links (don't nest a
// link inside a link) and definitions. Everything else is walked.
const SKIP_TYPES = new Set(["link", "linkReference", "definition"]);

function transform(node: MdastNode): void {
  const children = node.children;
  if (!Array.isArray(children) || children.length === 0) return;

  const next: MdastNode[] = [];
  let changed = false;
  for (const child of children) {
    if (child.type === "text" && typeof child.value === "string") {
      const split = splitTextIntoPathNodes(child.value);
      if (split) {
        next.push(...split);
        changed = true;
        continue;
      }
      next.push(child);
      continue;
    }
    if (!SKIP_TYPES.has(child.type)) transform(child);
    next.push(child);
  }
  if (changed) node.children = next;
}

/** Unified/remark plugin factory. */
export function remarkFilePaths() {
  return (tree: MdastNode): void => {
    transform(tree);
  };
}
