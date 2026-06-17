import type { IDisposable, ILink, Terminal } from "@xterm/xterm";
import { fetchPlugins, postLinkAction } from "./api";

interface CompiledLink {
  pluginId: string;
  rpcMethod: string;
  regex: RegExp;
}

/** Register an xterm link provider that turns text matching any active
 *  plugin's terminal link pattern into a clickable link. Clicking POSTs to
 *  the plugin's link-action endpoint (the server re-validates the rpc_method
 *  against the declared handlers). Returns a disposable, or null when no
 *  active plugin declares link handlers.
 *
 *  Column math uses string char index as the cell column, so a line with wide
 *  (CJK/emoji) glyphs left of a match can offset the underline; the click
 *  still dispatches the right matched text. Good enough for the ASCII URLs and
 *  ids these patterns target. */
export async function registerPluginLinkProvider(
  term: Terminal,
  sessionId: string | null,
): Promise<IDisposable | null> {
  const list = await fetchPlugins();
  if (!list) return null;
  const compiled: CompiledLink[] = [];
  for (const p of list.plugins) {
    if (!p.active) continue;
    for (const h of p.link_handlers ?? []) {
      try {
        compiled.push({
          pluginId: p.id,
          rpcMethod: h.rpc_method,
          regex: new RegExp(h.pattern, "g"),
        });
      } catch {
        // An invalid pattern is skipped, mirroring the host's compile step.
      }
    }
  }
  if (compiled.length === 0) return null;

  return term.registerLinkProvider({
    provideLinks(bufferLineNumber, callback) {
      const line = term.buffer.active.getLine(bufferLineNumber - 1);
      if (!line) {
        callback(undefined);
        return;
      }
      const text = line.translateToString(true);
      const links: ILink[] = [];
      for (const c of compiled) {
        c.regex.lastIndex = 0;
        for (const m of text.matchAll(c.regex)) {
          const start = m.index ?? 0;
          const matched = m[0];
          if (matched.length === 0) continue;
          links.push({
            // xterm ranges are 1-based, inclusive cell positions.
            range: {
              start: { x: start + 1, y: bufferLineNumber },
              end: { x: start + matched.length, y: bufferLineNumber },
            },
            text: matched,
            activate() {
              void postLinkAction(c.pluginId, c.rpcMethod, matched, sessionId);
            },
          });
        }
      }
      callback(links.length > 0 ? links : undefined);
    },
  });
}
