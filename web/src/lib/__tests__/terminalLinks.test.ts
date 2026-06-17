// Unit coverage for the plugin terminal link provider (#268 extension
// points). The provider is otherwise only exercised inside the live xterm
// terminal, which does not feed the Vitest patch lane, so the regex match ->
// xterm range mapping and the activate -> POST payload are locked in here.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ILink, ILinkProvider, IDisposable, Terminal } from "@xterm/xterm";

import { registerPluginLinkProvider } from "../terminalLinks";
import type { PluginLinkHandler } from "../api";

const fetchSpy = vi.fn<typeof fetch>();

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function pluginsResponse(handlers: PluginLinkHandler[]): Response {
  return jsonResponse({
    plugins: [
      {
        id: "acme",
        name: "Acme",
        version: "1.0.0",
        description: "",
        source: "builtin",
        trust: "builtin",
        enabled: true,
        grant: "granted",
        active: true,
        capabilities: ["terminal-links"],
        has_runtime: true,
        setting_count: 0,
        builtin: true,
        link_handlers: handlers,
      },
    ],
    load_errors: [],
    isolation_summary: "",
  });
}

function fakeTerm(lineText: string): { term: Terminal; getProvider: () => ILinkProvider | null } {
  let provider: ILinkProvider | null = null;
  const term = {
    registerLinkProvider(p: ILinkProvider): IDisposable {
      provider = p;
      return { dispose() {} };
    },
    buffer: {
      active: {
        getLine: (i: number) => (i === 0 ? { translateToString: () => lineText } : undefined),
      },
    },
  } as unknown as Terminal;
  return { term, getProvider: () => provider };
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  fetchSpy.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("registerPluginLinkProvider", () => {
  it("returns null when no active plugin declares link handlers", async () => {
    fetchSpy.mockResolvedValueOnce(pluginsResponse([]));
    const { term } = fakeTerm("nothing here");
    expect(await registerPluginLinkProvider(term, "s1")).toBeNull();
  });

  it("maps a regex match to a 1-based inclusive xterm range and POSTs on activate", async () => {
    fetchSpy.mockResolvedValueOnce(pluginsResponse([{ pattern: "#\\d+", rpc_method: "open_issue" }]));
    const { term, getProvider } = fakeTerm("see #123 here");
    const disposable = await registerPluginLinkProvider(term, "s1");
    expect(disposable).not.toBeNull();

    const provider = getProvider();
    expect(provider).not.toBeNull();
    let links: ILink[] | undefined;
    provider!.provideLinks(1, (l) => {
      links = l;
    });
    expect(links).toHaveLength(1);
    expect(links![0].text).toBe("#123");
    // "#123" starts at char index 4: 1-based inclusive range is x 5..8.
    expect(links![0].range).toEqual({ start: { x: 5, y: 1 }, end: { x: 8, y: 1 } });

    fetchSpy.mockResolvedValueOnce(jsonResponse({ result: null }));
    links![0].activate({} as MouseEvent, "#123");
    await Promise.resolve();

    const call = fetchSpy.mock.calls[1];
    expect(call?.[0]).toBe("/api/plugins/acme/link-action");
    const init = call?.[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      rpc_method: "open_issue",
      text: "#123",
      session_id: "s1",
    });
  });

  it("skips an invalid regex without throwing", async () => {
    fetchSpy.mockResolvedValueOnce(pluginsResponse([{ pattern: "([unclosed", rpc_method: "x" }]));
    const { term } = fakeTerm("anything");
    expect(await registerPluginLinkProvider(term, "s1")).toBeNull();
  });
});
