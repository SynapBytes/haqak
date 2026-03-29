import { describe, expect, it } from "vitest";
import { validateAllMagicBytes, validateMagicBytes } from "./magicByteValidator";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Build a File whose first bytes are the given signature, then padded with 0x00. */
function makeFileWithMagic(
  magic: number[],
  fileName: string,
  mimeType: string,
  totalSize = 64,
): File {
  const bytes = new Uint8Array(totalSize);
  magic.forEach((b, i) => { bytes[i] = b; });
  return new File([bytes], fileName, { type: mimeType });
}

/** Build a File with all bytes set to the given filler value. */
function makeFilledFile(
  filler: number,
  fileName: string,
  mimeType: string,
  size = 64,
): File {
  return new File([new Uint8Array(size).fill(filler)], fileName, { type: mimeType });
}

// ── PDF ────────────────────────────────────────────────────────────────────────

describe("magicByteValidator – PDF", () => {
  it("accepts a valid PDF (starts with %PDF)", async () => {
    const file = makeFileWithMagic([0x25, 0x50, 0x44, 0x46], "report.pdf", "application/pdf");
    expect((await validateMagicBytes(file)).valid).toBe(true);
  });

  it("rejects a disguised PDF (wrong magic bytes)", async () => {
    const file = makeFilledFile(0x00, "malicious.pdf", "application/pdf");
    const result = await validateMagicBytes(file);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("application/pdf");
  });
});

// ── JPEG ───────────────────────────────────────────────────────────────────────

describe("magicByteValidator – JPEG", () => {
  it("accepts a valid JPEG (starts with FF D8 FF)", async () => {
    const file = makeFileWithMagic([0xff, 0xd8, 0xff, 0xe0], "photo.jpg", "image/jpeg");
    expect((await validateMagicBytes(file)).valid).toBe(true);
  });

  it("rejects a file named .jpg with PDF content", async () => {
    // File claims to be JPEG but magic bytes are PDF
    const file = makeFileWithMagic([0x25, 0x50, 0x44, 0x46], "fake.jpg", "image/jpeg");
    const result = await validateMagicBytes(file);
    expect(result.valid).toBe(false);
  });
});

// ── PNG ────────────────────────────────────────────────────────────────────────

describe("magicByteValidator – PNG", () => {
  it("accepts a valid PNG (correct 8-byte signature)", async () => {
    const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const file = makeFileWithMagic(pngMagic, "image.png", "image/png");
    expect((await validateMagicBytes(file)).valid).toBe(true);
  });

  it("rejects a PNG with wrong magic bytes", async () => {
    const file = makeFilledFile(0x42, "bad.png", "image/png");
    expect((await validateMagicBytes(file)).valid).toBe(false);
  });
});

// ── DOCX ───────────────────────────────────────────────────────────────────────

describe("magicByteValidator – DOCX", () => {
  const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  it("accepts a valid DOCX (PK ZIP header 03 04)", async () => {
    const file = makeFileWithMagic([0x50, 0x4b, 0x03, 0x04], "doc.docx", DOCX_MIME);
    expect((await validateMagicBytes(file)).valid).toBe(true);
  });

  it("accepts a valid DOCX (PK empty ZIP header 05 06)", async () => {
    const file = makeFileWithMagic([0x50, 0x4b, 0x05, 0x06], "empty.docx", DOCX_MIME);
    expect((await validateMagicBytes(file)).valid).toBe(true);
  });

  it("rejects a DOCX with non-ZIP magic bytes", async () => {
    const file = makeFilledFile(0x00, "fake.docx", DOCX_MIME);
    expect((await validateMagicBytes(file)).valid).toBe(false);
  });
});

// ── Unknown MIME ───────────────────────────────────────────────────────────────

describe("magicByteValidator – unknown MIME type", () => {
  it("passes through files with unrecognised MIME types (no rule)", async () => {
    // application/x-custom has no rule — validator defers to other checks
    const file = makeFilledFile(0x00, "data.bin", "application/x-custom");
    expect((await validateMagicBytes(file)).valid).toBe(true);
  });
});

// ── Batch validation ───────────────────────────────────────────────────────────

describe("validateAllMagicBytes", () => {
  const pngMagic = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

  it("accepts a batch of valid files", async () => {
    const files = [
      makeFileWithMagic([0x25, 0x50, 0x44, 0x46], "a.pdf", "application/pdf"),
      makeFileWithMagic(pngMagic, "b.png", "image/png"),
    ];
    expect((await validateAllMagicBytes(files)).valid).toBe(true);
  });

  it("returns the first failure in a batch", async () => {
    const files = [
      makeFileWithMagic([0x25, 0x50, 0x44, 0x46], "ok.pdf", "application/pdf"),
      makeFilledFile(0xaa, "bad.png", "image/png"),
    ];
    const result = await validateAllMagicBytes(files);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("bad.png");
  });

  it("accepts an empty file array", async () => {
    expect((await validateAllMagicBytes([])).valid).toBe(true);
  });
});
