/**
 * fileIntegrityService.ts
 *
 * SHA-256 file integrity verification for uploads.
 *
 * Flow:
 * 1. Compute the SHA-256 hash of the file before upload.
 * 2. After the file is stored in Supabase Storage, download it and
 *    compute the SHA-256 hash again.
 * 3. Compare the two hashes; if they differ the upload was corrupted.
 *
 * This protects against silent data corruption during transit and ensures
 * that the bytes stored on the server match what the user submitted.
 */

export interface IntegrityResult {
  valid: boolean;
  hash?: string;
  error?: string;
}

/**
 * Compute the SHA-256 hash of `data` and return it as a lowercase hex string.
 */
export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const buf = data instanceof Uint8Array ? (data.buffer as ArrayBuffer) : data;
  const hashBuf = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Read `file` into an `ArrayBuffer` and return its SHA-256 hex digest.
 * Uses `FileReader` for broad browser/jsdom compatibility.
 */
export async function hashFile(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        resolve(await sha256Hex(reader.result as ArrayBuffer));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Compute the SHA-256 hash of the bytes at `url` (e.g. a signed Supabase
 * Storage URL) and return it as a lowercase hex string.
 *
 * Throws if the fetch fails.
 */
export async function hashRemoteFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch remote file for integrity check: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return sha256Hex(buffer);
}

/**
 * Verify that the file at `remoteUrl` has the same SHA-256 hash as the local
 * `file`.
 *
 * Returns `{ valid: true, hash }` on success or `{ valid: false, error }` on
 * failure.
 */
export async function verifyUploadIntegrity(
  file: File,
  remoteUrl: string,
): Promise<IntegrityResult> {
  try {
    const [localHash, remoteHash] = await Promise.all([
      hashFile(file),
      hashRemoteFile(remoteUrl),
    ]);

    if (localHash !== remoteHash) {
      return {
        valid: false,
        error: `Integrity check failed for "${file.name}": local hash ${localHash} does not match remote hash ${remoteHash}.`,
      };
    }

    return { valid: true, hash: localHash };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
