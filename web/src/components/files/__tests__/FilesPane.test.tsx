// @vitest-environment jsdom
//
// FilesPane lists the session's produced files (from useFilesIndex, mocked
// here) and opens one via the shared onOpenFile handler. Covers rendering the
// list, click-to-open with the full relative path, the filter, and the
// loading / empty states.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

vi.mock("../../acp/useFilesIndex", () => ({
  useFilesIndex: vi.fn(),
}));

import { useFilesIndex } from "../../acp/useFilesIndex";
import { FilesPane } from "../FilesPane";

const mockUseFilesIndex = vi.mocked(useFilesIndex);

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("FilesPane", () => {
  it("renders the file list and opens a file with its full relative path", () => {
    mockUseFilesIndex.mockReturnValue({
      files: ["src/app.ts", "src/lib/util.ts", "README.md"],
      loading: false,
    });
    const onOpenFile = vi.fn();
    render(<FilesPane sessionId="s1" onOpenFile={onOpenFile} />);

    // Each file renders a clickable row titled with its full path.
    expect(screen.getByTitle("src/app.ts")).toBeTruthy();
    expect(screen.getByTitle("src/lib/util.ts")).toBeTruthy();
    expect(screen.getByTitle("README.md")).toBeTruthy();

    fireEvent.click(screen.getByTitle("src/lib/util.ts"));
    expect(onOpenFile).toHaveBeenCalledTimes(1);
    expect(onOpenFile).toHaveBeenCalledWith("src/lib/util.ts");
  });

  it("filters the list by the query", () => {
    mockUseFilesIndex.mockReturnValue({
      files: ["src/app.ts", "src/lib/util.ts", "README.md"],
      loading: false,
    });
    render(<FilesPane sessionId="s1" onOpenFile={vi.fn()} />);

    fireEvent.change(screen.getByRole("textbox", { name: "Filter files" }), {
      target: { value: "util" },
    });

    expect(screen.getByTitle("src/lib/util.ts")).toBeTruthy();
    expect(screen.queryByTitle("src/app.ts")).toBeNull();
    expect(screen.queryByTitle("README.md")).toBeNull();
  });

  it("shows the loading state", () => {
    mockUseFilesIndex.mockReturnValue({ files: [], loading: true });
    render(<FilesPane sessionId="s1" onOpenFile={vi.fn()} />);
    expect(screen.getByText("Loading files…")).toBeTruthy();
  });

  it("shows an empty state when the session has no files", () => {
    mockUseFilesIndex.mockReturnValue({ files: [], loading: false });
    render(<FilesPane sessionId="s1" onOpenFile={vi.fn()} />);
    expect(screen.getByText(/No files in this session/)).toBeTruthy();
  });
});
