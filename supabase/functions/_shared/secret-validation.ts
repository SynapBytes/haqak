/**
 * Runtime secret-validation helpers.
 *
 * Call `validateProductionSecrets()` at the top of any edge function that
 * handles sensitive operations.  It is a no-op in development and logs a
 * structured warning (never throws) so a misconfiguration degrades gracefully
 * instead of taking the function offline.
 *
 * Usage:
 *   import { validateProductionSecrets } from "../_shared/secret-validation.ts";
 *   await validateProductionSecrets(["OTP_HMAC_SECRET", "SUPABASE_SERVICE_ROLE_KEY"]);
 */

// ── Known-weak placeholder patterns ──────────────────────────────────────────

const WEAK_PATTERNS = [
  /^your[_-]/i,
  /^change[_-]?me/i,
  /^todo/i,
  /^placeholder/i,
  /^test[_-]?secret/i,
  /^example/i,
  /^default/i,
  /^secret$/i,
  /^password/i,
  /^12345/,
  /^0{8,}/,
  /^1{8,}/,
  /^a{8,}/i,
  /^(abc){3,}/i,
  /^deadbeef/i,
  /^cafebabe/i,
];

// ── Entropy helpers ───────────────────────────────────────────────────────────

/**
 * Rough Shannon-entropy estimate in bits per character.
 * A random hex string of length 64 scores ~4 bits/char → 256 bits total.
 */
function shannonEntropy(value: string): number {
  const freq: Record<string, number> = {};
  for (const ch of value) freq[ch] = (freq[ch] ?? 0) + 1;
  const len = value.length;
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }
  return entropy;
}

// ── Validation logic ──────────────────────────────────────────────────────────

export interface SecretValidationResult {
  name: string;
  ok: boolean;
  reason?: string;
}

const MIN_SECRET_LENGTH = 32;
const MIN_ENTROPY_BITS_PER_CHAR = 3.0;

/**
 * Validate a single secret value against strength requirements.
 *
 * Returns `{ ok: true }` when the value is acceptable, or
 * `{ ok: false, reason: "..." }` describing the weakness.
 */
export function validateSecretStrength(
  name: string,
  value: string | null | undefined,
): SecretValidationResult {
  if (!value) {
    return { name, ok: false, reason: "missing or empty" };
  }
  if (value.length < MIN_SECRET_LENGTH) {
    return {
      name,
      ok: false,
      reason: `too short (${value.length} chars, minimum ${MIN_SECRET_LENGTH})`,
    };
  }
  for (const pattern of WEAK_PATTERNS) {
    if (pattern.test(value)) {
      return { name, ok: false, reason: "matches known-weak/placeholder pattern" };
    }
  }
  const entropy = shannonEntropy(value);
  if (entropy < MIN_ENTROPY_BITS_PER_CHAR) {
    return {
      name,
      ok: false,
      reason: `low entropy (${entropy.toFixed(2)} bits/char, minimum ${MIN_ENTROPY_BITS_PER_CHAR})`,
    };
  }
  return { name, ok: true };
}

// ── Production guard ──────────────────────────────────────────────────────────

/**
 * Validate that the named environment variables meet cryptographic-strength
 * requirements.
 *
 * - In **production** (`ENVIRONMENT=production`): logs structured errors for
 *   every weak secret.  Does NOT throw; the caller can decide to abort.
 * - In **development/test**: skips all checks (placeholder values are fine).
 *
 * Returns `true` when all secrets pass, `false` when any fail.
 */
export function validateProductionSecrets(
  names: string[],
): boolean {
  const env = (Deno.env.get("ENVIRONMENT") ?? "development").toLowerCase();
  if (env !== "production") return true;

  let allOk = true;
  for (const name of names) {
    const value = Deno.env.get(name);
    const result = validateSecretStrength(name, value);
    if (!result.ok) {
      allOk = false;
      console.error(
        JSON.stringify({
          level: "error",
          event: "weak_secret_detected",
          secret: name,
          reason: result.reason,
          action: "Rotate this secret immediately. See docs/SECURITY_SECRET_ROTATION.md",
        }),
      );
    }
  }
  return allOk;
}
