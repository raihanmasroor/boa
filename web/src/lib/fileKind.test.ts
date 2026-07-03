// Renderer-branching for the produced-file viewer: `fileKindFor` decides which
// renderer the FileViewer mounts per extension (and per response mime when the
// extension gives no signal). Also covers the active-type download guard and
// the endpoint URL builder.

import { describe, expect, it } from "vitest";
import { fileKindFor, isInlinePreviewMedia, sessionFileUrl } from "./fileKind";

describe("fileKindFor — extension branching", () => {
  it("routes markdown extensions to the markdown renderer", () => {
    for (const p of ["README.md", "notes.markdown", "a/b/doc.MKD"]) {
      expect(fileKindFor(p)).toBe("markdown");
    }
  });

  it("routes source/text extensions to the text renderer", () => {
    for (const p of [
      "src/app.ts",
      "src/App.tsx",
      "main.py",
      "lib.rs",
      "go.mod.notreal.go",
      "config.json",
      "styles.css",
      "data.csv",
      "script.sh",
      "Cargo.toml",
      "values.yaml",
      "notes.txt",
    ]) {
      expect(fileKindFor(p)).toBe("text");
    }
  });

  it("routes extensionless known basenames to text", () => {
    expect(fileKindFor("/repo/Dockerfile")).toBe("text");
    expect(fileKindFor("Makefile")).toBe("text");
    expect(fileKindFor("project/LICENSE")).toBe("text");
  });

  it("routes safe raster images to the image renderer", () => {
    for (const p of ["shot.png", "photo.JPG", "a.jpeg", "loop.gif", "pic.webp", "x.avif", "icon.ico"]) {
      expect(fileKindFor(p)).toBe("image");
    }
  });

  it("routes pdf to the pdf renderer", () => {
    expect(fileKindFor("report.pdf")).toBe("pdf");
    expect(fileKindFor("/abs/Report.PDF")).toBe("pdf");
  });

  it("routes active types (svg/html/xml) to download, never inline", () => {
    for (const p of ["icon.svg", "page.html", "index.htm", "doc.xhtml", "feed.xml", "sheet.xsl"]) {
      expect(fileKindFor(p)).toBe("download");
    }
  });

  it("returns unknown for an unrecognized extension with no mime", () => {
    expect(fileKindFor("archive.bin")).toBe("unknown");
    expect(fileKindFor("mystery.zzz")).toBe("unknown");
  });
});

describe("fileKindFor — mime fallback", () => {
  it("uses the mime when the extension is unknown", () => {
    expect(fileKindFor("blob.bin", "text/plain")).toBe("text");
    expect(fileKindFor("blob.bin", "application/json")).toBe("text");
    expect(fileKindFor("blob.bin", "image/png")).toBe("image");
    expect(fileKindFor("blob.bin", "application/pdf")).toBe("pdf");
    expect(fileKindFor("blob.bin", "application/octet-stream")).toBe("download");
  });

  it("treats active mimes as download even via the fallback", () => {
    expect(fileKindFor("blob.bin", "text/html")).toBe("download");
    expect(fileKindFor("blob.bin", "image/svg+xml")).toBe("download");
    expect(fileKindFor("blob.bin", "application/xml")).toBe("download");
  });

  it("prefers the extension over the mime when the extension is known", () => {
    // A .png labeled text/plain by the server is still an image by extension.
    expect(fileKindFor("shot.png", "text/plain")).toBe("image");
    // A .html is download-only regardless of a claimed inline mime.
    expect(fileKindFor("page.html", "text/plain")).toBe("download");
  });
});

describe("isInlinePreviewMedia", () => {
  it("is true only for images and pdfs", () => {
    expect(isInlinePreviewMedia("a.png")).toBe(true);
    expect(isInlinePreviewMedia("a.pdf")).toBe(true);
    expect(isInlinePreviewMedia("a.md")).toBe(false);
    expect(isInlinePreviewMedia("a.ts")).toBe(false);
    expect(isInlinePreviewMedia("a.svg")).toBe(false);
  });
});

describe("sessionFileUrl", () => {
  it("encodes the session id and path", () => {
    expect(sessionFileUrl("sess 1", "src/a b.ts")).toBe(
      "/api/sessions/sess%201/file?path=src%2Fa+b.ts",
    );
  });

  it("adds download=true when requested", () => {
    expect(sessionFileUrl("s", "x.bin", true)).toBe("/api/sessions/s/file?path=x.bin&download=true");
  });
});
