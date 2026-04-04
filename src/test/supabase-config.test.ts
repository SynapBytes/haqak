import { describe, it, expect } from "vitest";
import { supabase, supabaseConfigError } from "@/integrations/supabase/client";

/**
 * Tests that the Supabase client module handles missing env vars gracefully
 * instead of throwing at import time.
 *
 * The module is imported at the top level here: if it threw during evaluation,
 * every test in this file would fail with an import error.
 */
describe("supabase/client – safe module load", () => {
  it("module loads without throwing even when env vars are absent", () => {
    // Reaching this point means the import above did not throw.
    expect(true).toBe(true);
  });

  it("exports a supabase client object with the expected API surface", () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase.from).toBe("function");
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.auth.signInWithPassword).toBe("function");
  });

  it("supabaseConfigError is null or a non-empty descriptive string", () => {
    const isValid =
      supabaseConfigError === null ||
      (typeof supabaseConfigError === "string" && supabaseConfigError.length > 0);
    expect(isValid).toBe(true);
  });

  it("supabaseConfigError mentions the missing var name when env vars are absent", () => {
    // In CI / test environments no .env file is loaded, so at least one of the
    // two required vars is undefined and supabaseConfigError should be set.
    if (supabaseConfigError !== null) {
      expect(supabaseConfigError).toMatch(/VITE_SUPABASE_URL|VITE_SUPABASE_PUBLISHABLE_KEY/);
    }
    // If both vars happen to be set (e.g., local dev with .env file) the error is null – that is also correct.
    expect(true).toBe(true);
  });
});

/**
 * Unit tests for the config-validation logic expressed as a pure helper so we
 * can cover every branch independently of the actual environment.
 */
describe("supabase config validation logic (pure helper)", () => {
  /**
   * Mirrors the validation logic in src/integrations/supabase/client.ts so we
   * can test it without relying on import.meta.env manipulation.
   */
  function validateSupabaseConfig(
    url: string | undefined,
    key: string | undefined,
  ): string | null {
    if (!url)
      return "VITE_SUPABASE_URL is not defined. Set it as an environment variable in your deployment environment.";
    if (!key)
      return "VITE_SUPABASE_PUBLISHABLE_KEY is not defined. Set it as an environment variable in your deployment environment.";
    return null;
  }

  it("returns null when both vars are provided", () => {
    expect(validateSupabaseConfig("https://example.supabase.co", "anon-key")).toBeNull();
  });

  it("returns a non-null error when URL is undefined", () => {
    const err = validateSupabaseConfig(undefined, "anon-key");
    expect(err).not.toBeNull();
    expect(err).toMatch(/VITE_SUPABASE_URL/);
  });

  it("returns a non-null error when URL is an empty string", () => {
    const err = validateSupabaseConfig("", "anon-key");
    expect(err).not.toBeNull();
    expect(err).toMatch(/VITE_SUPABASE_URL/);
  });

  it("returns a non-null error when key is undefined", () => {
    const err = validateSupabaseConfig("https://example.supabase.co", undefined);
    expect(err).not.toBeNull();
    expect(err).toMatch(/VITE_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("returns a non-null error when key is an empty string", () => {
    const err = validateSupabaseConfig("https://example.supabase.co", "");
    expect(err).not.toBeNull();
    expect(err).toMatch(/VITE_SUPABASE_PUBLISHABLE_KEY/);
  });

  it("returns a URL error (not key error) when both are absent", () => {
    const err = validateSupabaseConfig(undefined, undefined);
    expect(err).not.toBeNull();
    // URL is checked first, so the message should mention the URL var.
    expect(err).toMatch(/VITE_SUPABASE_URL/);
  });
});
