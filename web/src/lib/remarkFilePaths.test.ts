// The remark plugin turns bare absolute filesystem paths in prose into link
// nodes so TranscriptLink can intercept them. These cover the pure text→nodes
// split and the tree transform's skip rules.

import { describe, expect, it } from "vitest";
import { remarkFilePaths, splitTextIntoPathNodes } from "./remarkFilePaths";

describe("splitTextIntoPathNodes", () => {
  it("linkifies a bare absolute path with a line suffix", () => {
    const nodes = splitTextIntoPathNodes("see /Users/me/repo/src/app.ts:42 for the fix");
    expect(nodes).not.toBeNull();
    const link = nodes!.find((n) => n.type === "link");
    expect(link?.url).toBe("/Users/me/repo/src/app.ts:42");
    // Surrounding prose is preserved as text nodes on either side.
    expect(nodes![0]).toMatchObject({ type: "text", value: "see " });
    expect(nodes![nodes!.length - 1]).toMatchObject({ type: "text", value: " for the fix" });
  });

  it("linkifies multiple paths in one string", () => {
    const nodes = splitTextIntoPathNodes("/a/b/c.ts and /d/e/f.rs");
    const links = nodes!.filter((n) => n.type === "link").map((n) => n.url);
    expect(links).toEqual(["/a/b/c.ts", "/d/e/f.rs"]);
  });

  it("returns null when there is no path to linkify", () => {
    expect(splitTextIntoPathNodes("just some prose with no paths")).toBeNull();
    // A single-segment absolute token is not linkified (avoids false positives).
    expect(splitTextIntoPathNodes("the /tmp value")).toBeNull();
    // A slash inside a word is not a path start.
    expect(splitTextIntoPathNodes("read/write access")).toBeNull();
  });
});

describe("remarkFilePaths transform", () => {
  it("rewrites text children but skips existing link subtrees", () => {
    // mdast: a paragraph with a bare path text node, and a link whose child
    // text also looks like a path (must be left alone — no nested link).
    const tree = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: [
            { type: "text", value: "open /x/y/z.ts now" },
            { type: "link", url: "https://example.com", children: [{ type: "text", value: "/nested/path.ts" }] },
          ],
        },
      ],
    };
    remarkFilePaths()(tree);
    const para = tree.children[0] as { children: { type: string; url?: string }[] };
    const links = para.children.filter((n) => n.type === "link");
    // One new link from the bare path; the pre-existing link is untouched
    // (still exactly one child text node, not re-split into a nested link).
    const newLink = links.find((l) => l.url === "/x/y/z.ts");
    expect(newLink).toBeTruthy();
    const existing = links.find((l) => l.url === "https://example.com") as {
      children: { type: string }[];
    };
    expect(existing.children).toHaveLength(1);
    expect(existing.children[0].type).toBe("text");
  });
});
