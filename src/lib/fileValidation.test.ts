import { describe, expect, it } from "vitest";
import {
  ALLOWED_FILE_TYPES,
  MAX_FILES_PER_UPLOAD,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
} from "@/constants/uploadConstraints";
import { validateBeforeUpload, validateNewFiles } from "./fileValidation";

const createFile = (
  size: number,
  name = "file.pdf",
  type = "application/pdf",
) => new File(["a".repeat(size)], name, { type });

describe("fileValidation", () => {
  it("accepts valid files within limits", () => {
    const files = [
      createFile(1_000, "file.pdf", "application/pdf"),
      createFile(2_000, "doc.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    ];
    const result = validateNewFiles([], files);
    expect(result.valid).toBe(true);
  });

  it("rejects when exceeding max file count", () => {
    const files = Array.from({ length: MAX_FILES_PER_UPLOAD + 1 }, (_, i) =>
      createFile(1_000, `file-${i}.pdf`),
    );
    const result = validateNewFiles([], files);
    expect(result.valid).toBe(false);
  });

  it("rejects disallowed file types", () => {
    const files = [createFile(1_000, "script.exe", "application/x-msdownload")];
    const result = validateNewFiles([], files);
    expect(result.valid).toBe(false);
  });

  it("rejects a file larger than the per-file limit", () => {
    const bigFile = createFile(MAX_FILE_SIZE_BYTES + 1, "photo.jpg", "image/jpeg");
    const result = validateNewFiles([], [bigFile]);
    expect(result.valid).toBe(false);
  });

  it("rejects when total size exceeds batch limit", () => {
    const single = createFile(MAX_TOTAL_SIZE_BYTES - 1, "doc.pdf");
    const another = createFile(5_000, "extra.pdf");
    const result = validateNewFiles([single], [another]);
    expect(result.valid).toBe(false);
  });

  it("rejects allowed extension with disallowed mime", () => {
    const disguised = createFile(1_000, "malicious.pdf", "application/x-msdownload");
    const result = validateNewFiles([], [disguised]);
    expect(result.valid).toBe(false);
  });

  it("rejects executable even with explicit mime", () => {
    const exeFile = createFile(500, "malicious.exe", "application/x-msdownload");
    const result = validateNewFiles([], [exeFile]);
    expect(result.valid).toBe(false);
  });

  it("defensively validates before upload", () => {
    const valid = validateBeforeUpload([createFile(1_000, "ok.pdf", "application/pdf")]);
    expect(valid.valid).toBe(true);

    const tooBig = validateBeforeUpload([
      createFile(MAX_FILE_SIZE_BYTES + 5, "large.png", "image/png"),
    ]);
    expect(tooBig.valid).toBe(false);
  });

  it("aligns allowed extensions list", () => {
    expect(ALLOWED_FILE_TYPES).toContain("pdf");
    expect(ALLOWED_FILE_TYPES).toContain("png");
  });
});
