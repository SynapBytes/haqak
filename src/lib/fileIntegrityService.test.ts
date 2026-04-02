import { describe, expect, it, vi } from "vitest";
import { hashFile, sha256Hex, verifyUploadIntegrity } from "./fileIntegrityService";

// ── sha256Hex ──────────────────────────────────────────────────────────────────

describe("sha256Hex", () => {
  it("returns a 64-character lowercase hex string", async () => {
    const buf = new TextEncoder().encode("hello").buffer as ArrayBuffer;
    const hash = await sha256Hex(buf);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  it("produces the known SHA-256 of 'hello'", async () => {
    // echo -n hello | sha256sum → 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const buf = new TextEncoder().encode("hello").buffer as ArrayBuffer;
    expect(await sha256Hex(buf)).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("different inputs produce different hashes", async () => {
    const a = new TextEncoder().encode("aaa").buffer as ArrayBuffer;
    const b = new TextEncoder().encode("bbb").buffer as ArrayBuffer;
    expect(await sha256Hex(a)).not.toBe(await sha256Hex(b));
  });
});

// ── hashFile ───────────────────────────────────────────────────────────────────

describe("hashFile", () => {
  it("hashes a File object", async () => {
    const file = new File(["hello"], "test.txt", { type: "text/plain" });
    const hash = await hashFile(file);
    expect(hash).toBe("2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824");
  });

  it("produces unique hashes for files with different content", async () => {
    const f1 = new File(["content-a"], "a.txt", { type: "text/plain" });
    const f2 = new File(["content-b"], "b.txt", { type: "text/plain" });
    expect(await hashFile(f1)).not.toBe(await hashFile(f2));
  });
});

// ── verifyUploadIntegrity ──────────────────────────────────────────────────────

describe("verifyUploadIntegrity", () => {
  it("returns valid:true when hashes match", async () => {
    const content = "upload content";
    const file = new File([content], "doc.pdf", { type: "application/pdf" });
    const expectedHash = await hashFile(file);

    // Simulate the remote URL returning the same bytes
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode(content).buffer,
      }),
    );

    const result = await verifyUploadIntegrity(file, "https://example.com/file");
    expect(result.valid).toBe(true);
    expect(result.hash).toBe(expectedHash);

    vi.unstubAllGlobals();
  });

  it("returns valid:false when hashes differ (corruption detected)", async () => {
    const file = new File(["original"], "doc.pdf", { type: "application/pdf" });

    // Remote file has different content
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode("corrupted").buffer,
      }),
    );

    const result = await verifyUploadIntegrity(file, "https://example.com/file");
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/does not match/i);

    vi.unstubAllGlobals();
  });

  it("returns valid:false when remote fetch fails", async () => {
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 }),
    );

    const result = await verifyUploadIntegrity(file, "https://example.com/missing");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("404");

    vi.unstubAllGlobals();
  });

  it("returns valid:false when fetch throws", async () => {
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );

    const result = await verifyUploadIntegrity(file, "https://example.com/err");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Network error");

    vi.unstubAllGlobals();
  });
});
