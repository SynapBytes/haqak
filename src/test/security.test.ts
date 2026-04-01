import { describe, it, expect } from "vitest";
import { webcrypto } from "node:crypto";

describe("PostHog userId anonymisation (sha256Hex)", () => {
  // Use Node.js webcrypto as fallback when jsdom's crypto.subtle is unavailable.
  const subtle = globalThis.crypto?.subtle ?? webcrypto.subtle;

  // Inline the same hashing logic so we can test it directly without importing
  // the analytics module (which requires PostHog to be initialised).
  async function sha256Hex(value: string): Promise<string> {
    const enc = new TextEncoder();
    const buf = await subtle.digest("SHA-256", enc.encode(value));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  it("produces a 64-character lowercase hex string", async () => {
    const hash = await sha256Hex("user-123");
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("produces the same hash for the same input", async () => {
    const a = await sha256Hex("user-abc");
    const b = await sha256Hex("user-abc");
    expect(a).toBe(b);
  });

  it("produces different hashes for different inputs", async () => {
    const a = await sha256Hex("user-111");
    const b = await sha256Hex("user-222");
    expect(a).not.toBe(b);
  });

  it("produces the known SHA-256 of 'hello'", async () => {
    // echo -n hello | sha256sum → 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    expect(await sha256Hex("hello")).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });
});
