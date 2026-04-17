// Prefer globalThis.crypto.subtle (browser / Node 20+).
// Node 18 exposes WebCrypto under globalThis.crypto.webcrypto.subtle instead.
const subtle =
  globalThis.crypto?.subtle ??
  (globalThis as typeof globalThis & { crypto?: { webcrypto?: Crypto } }).crypto?.webcrypto
    ?.subtle;

if (!subtle) {
  throw new Error("WebCrypto SubtleCrypto is not available in this environment.");
}

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

  const hashBuf = await subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
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

function buildValidatedUrl(baseUrl: string): string {
  try {
    // Minimal path validation
    if (baseUrl.includes('/../') || /\/%2e%2e\//i.test(baseUrl)) {
      throw new Error('Invalid path');
    }
    
    const url = new URL(baseUrl);
    
    // Protocol + host checks
    const allowedDomains = ['example.com']; // add your allowed domains here
    if (!allowedDomains.includes(url.hostname)) {
      throw new Error('Invalid host');
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    
    return url.href;
  } catch {
    throw new Error('Invalid URL');
  }
}

export async function hashRemoteFile(url: string): Promise<string> {
  const validatedUrl = buildValidatedUrl(url);
  const response = await fetch(validatedUrl);
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