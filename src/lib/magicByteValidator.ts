/**
 * magicByteValidator.ts
 *
 * Client-side magic byte (file signature) validation.
 *
 * Validates that the first bytes of a file match the expected signature for its
 * declared MIME type, preventing the most common file-masquerading attacks
 * (e.g. renaming `malware.exe` to `report.pdf`).
 *
 * This is a client-side defence-in-depth measure.  The authoritative
 * server-side check lives in the `validate-file-upload` Edge Function.
 */

/** A magic-byte rule: the byte offset to start reading, and the expected bytes. */
interface MagicRule {
  offset: number;
  bytes: number[];
}

/** Maps MIME types to one or more valid magic-byte signatures. */
const MAGIC_RULES: Record<string, MagicRule[]> = {
  "application/pdf": [
    { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  ],
  "image/jpeg": [
    { offset: 0, bytes: [0xff, 0xd8, 0xff] },
  ],
  "image/png": [
    { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  ],
  // DOC (OLE2 Compound Document)
  "application/msword": [
    { offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  ],
  // DOCX / XLSX / PPTX (ZIP-based Office Open XML)
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] }, // PK\x03\x04 (ZIP local file header)
    { offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06] }, // PK\x05\x06 (empty ZIP)
  ],
};

/** Maximum number of bytes we need to read from the start of the file. */
const MAX_HEADER_BYTES = 16;

/**
 * Read the first `MAX_HEADER_BYTES` bytes of `file` as a `Uint8Array`.
 * Uses `FileReader` for broad browser/jsdom compatibility.
 */
async function readFileHeader(file: File): Promise<Uint8Array> {
  const slice = file.slice(0, MAX_HEADER_BYTES);
  return new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(slice);
  });
}

/**
 * Check whether `header` matches any of the given `rules`.
 */
function matchesAnyRule(header: Uint8Array, rules: MagicRule[]): boolean {
  return rules.some((rule) =>
    rule.bytes.every((byte, i) => header[rule.offset + i] === byte),
  );
}

export interface MagicByteValidationResult {
  valid: boolean;
  /** Human-readable explanation when `valid` is `false`. */
  error?: string;
}

/**
 * Validate that `file`'s magic bytes match its declared MIME type.
 *
 * Returns `{ valid: true }` for MIME types we do not have rules for (unknown
 * types pass through — the extension / MIME check in `fileValidation.ts` is the
 * first gate for those).
 */
export async function validateMagicBytes(
  file: File,
): Promise<MagicByteValidationResult> {
  const rules = MAGIC_RULES[file.type];
  if (!rules) {
    // No rule for this MIME type — let other validators handle it
    return { valid: true };
  }

  const header = await readFileHeader(file);
  if (!matchesAnyRule(header, rules)) {
    return {
      valid: false,
      error: `File "${file.name}" content does not match its declared type (${file.type}). The file may be corrupt or disguised.`,
    };
  }

  return { valid: true };
}

/**
 * Validate an array of files, returning on the first failure.
 */
export async function validateAllMagicBytes(
  files: File[],
): Promise<MagicByteValidationResult> {
  for (const file of files) {
    const result = await validateMagicBytes(file);
    if (!result.valid) return result;
  }
  return { valid: true };
}
