import { webcrypto as nodeCrypto } from "node:crypto";

// Prefer globalThis.crypto.subtle when available (browser/modern Node).
// In jsdom, globalThis.crypto exists but .subtle is undefined, so fall back
// to the Node.js webcrypto implementation in that case.
const subtle = globalThis.crypto?.subtle ?? nodeCrypto.subtle;

export interface IntegrityResult {
  valid: boolean;
  hash?: string;
  error?: string;
}

export async function sha256Hex(data: ArrayBuffer | Uint8Array): Promise<string> {
  const bytes =
    data instanceof Uint8Array
      ? new Uint8Array(data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength))
      : new Uint8Array(data);

  const hashBuf = await subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

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

export async function hashRemoteFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch remote file for integrity check: HTTP ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return sha256Hex(buffer);
}

export async function verifyUploadIntegrity(
  file: File,
  remoteUrl: string,
): Promise<IntegrityResult> {
  try {
    const [localHash, remoteHash] = await Promise.all([hashFile(file), hashRemoteFile(remoteUrl)]);

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