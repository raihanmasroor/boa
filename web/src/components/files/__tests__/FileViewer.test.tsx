// @vitest-environment jsdom
//
// FileViewer branches to a renderer by file extension (falling back to the
// response mime for unknown ones). These tests mock the authed fetch and the
// two heavy child renderers (Markdown, FullFileViewer) with lightweight stubs,
// then assert which branch the viewer chose per extension:
//   .md  → Markdown        .ts  → FullFileViewer
//   .png → <img blob>      .pdf → <iframe blob>
//   .svg → download card (no fetch, active-type XSS guard)
//   404  → error state
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

// Stub the heavy renderers so the branch is observable without pulling in the
// markdown primitive / shiki. Paths resolve to the same modules FileViewer
// imports, so vi.mock intercepts them.
vi.mock("../../acp/Markdown", () => ({
  Markdown: ({ text }: { text: string }) => <div data-testid="markdown">{text}</div>,
}));
vi.mock("../../diff/FullFileViewer", () => ({
  FullFileViewer: ({ content, filePath }: { content: string; filePath: string }) => (
    <div data-testid="full-file" data-path={filePath}>
      {content}
    </div>
  ),
}));
vi.mock("../../../lib/artifacts", () => ({
  openArtifactInNewTab: vi.fn(),
}));

import { FileViewer } from "../FileViewer";

/** Build a minimal Response-like object for the mocked fetch. */
function mockResponse(opts: {
  ok?: boolean;
  status?: number;
  mime?: string;
  text?: string;
  blob?: Blob;
}): Response {
  const { ok = true, status = 200, mime, text = "", blob } = opts;
  return {
    ok,
    status,
    headers: { get: (h: string) => (h.toLowerCase() === "content-type" ? (mime ?? null) : null) },
    text: () => Promise.resolve(text),
    blob: () => Promise.resolve(blob ?? new Blob([text])),
  } as unknown as Response;
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  // jsdom has no object-URL support; stub it for the image/pdf branches.
  vi.stubGlobal("URL", {
    ...URL,
    createObjectURL: vi.fn(() => "blob:mock-url"),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("FileViewer renderer branching", () => {
  it("renders markdown files with the Markdown renderer", async () => {
    fetchMock.mockResolvedValue(mockResponse({ mime: "text/markdown", text: "# Title" }));
    render(<FileViewer sessionId="s1" path="docs/readme.md" />);
    const md = await screen.findByTestId("markdown");
    expect(md.textContent).toBe("# Title");
    expect(screen.queryByTestId("full-file")).toBeNull();
  });

  it("renders source/text files with FullFileViewer", async () => {
    fetchMock.mockResolvedValue(mockResponse({ mime: "text/plain", text: "const x = 1;" }));
    render(<FileViewer sessionId="s1" path="src/app.ts" displayPath="app.ts" />);
    const full = await screen.findByTestId("full-file");
    expect(full.textContent).toBe("const x = 1;");
    // filePath is threaded through for grammar selection.
    expect(full.getAttribute("data-path")).toBe("app.ts");
  });

  it("renders images as an <img> pointed at the blob object URL", async () => {
    fetchMock.mockResolvedValue(mockResponse({ mime: "image/png", blob: new Blob(["x"]) }));
    render(<FileViewer sessionId="s1" path="assets/shot.png" />);
    const img = (await screen.findByRole("img")) as HTMLImageElement;
    expect(img.getAttribute("src")).toBe("blob:mock-url");
  });

  it("renders pdfs in an <iframe> pointed at the blob object URL", async () => {
    fetchMock.mockResolvedValue(mockResponse({ mime: "application/pdf", blob: new Blob(["%PDF"]) }));
    const { container } = render(<FileViewer sessionId="s1" path="report.pdf" />);
    // The iframe appears once the blob resolves.
    await screen.findByTitle("report.pdf");
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe("blob:mock-url");
  });

  it("shows the download card for active types without fetching (svg)", async () => {
    render(<FileViewer sessionId="s1" path="icon.svg" />);
    expect(await screen.findByText("Preview not available")).toBeTruthy();
    // Active types are known from the extension alone; no bytes are fetched.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a not-found error on a 404", async () => {
    fetchMock.mockResolvedValue(mockResponse({ ok: false, status: 404 }));
    render(<FileViewer sessionId="s1" path="gone.txt" />);
    expect(await screen.findByText("File not found.")).toBeTruthy();
  });
});
