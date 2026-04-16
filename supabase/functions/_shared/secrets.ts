/**
 * Secret retrieval utility — Vault-first with environment-variable fallback.
 *
 * Architecture:
 *   1. Try Supabase Vault (encrypted, rotatable without redeploy)
 *   2. Fall back to Deno.env (validated against entropy/weakness rules)
 *   3. Cache resolved values with a configurable TTL
 *
 * Usage:
 *   import { getSecret } from "../_shared/secrets.ts";
 *
 *   const otpSecret = await getSecret("OTP_HMAC_SECRET");
 *   if (!otpSecret) { ... handle missing secret ... }
 *
 * Vault setup (one-time):
 *   1. supabase vault add --name OTP_HMAC_SECRET --value "$(openssl rand -hex 32)"
 *   2. Grant SELECT on vault.decrypted_secrets to service_role (done by default).
 *   3. Set SUPABASE_VAULT_ENABLED=true in edge-function secrets.
 *   4. See docs/SECURITY_SECRET_ROTATION.md for the complete guide.
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

// ── Cache ─────────────────────────────────────────────────────────────────────

interface CacheEntry {
  value: string;
  expiresAt: number;
}

const secretCache = new Map<string, CacheEntry>();

/** Default cache TTL in milliseconds (5 minutes). */
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

/** Whether to attempt Vault lookups (opt-in via env var for gradual rollout). */
const VAULT_ENABLED = Deno.env.get("SUPABASE_VAULT_ENABLED") === "true";

// ── Vault ─────────────────────────────────────────────────────────────────────

let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient | null {
  if (_adminClient) return _adminClient;
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  _adminClient = createClient(url, key, { auth: { persistSession: false } });
  return _adminClient;
}

/**
 * Attempt to read a secret from Supabase Vault.
 *
 * Returns `null` if Vault is disabled, the secret doesn't exist, or any
 * error occurs (fail-open so env-var fallback is tried next).
 */
async function getFromVault(name: string): Promise<string | null> {
  if (!VAULT_ENABLED) return null;
  try {
    const client = getAdminClient();
    if (!client) return null;
    const { data, error } = await client
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .eq("name", name)
      .maybeSingle();
    if (error || !data?.decrypted_secret) return null;
    return data.decrypted_secret as string;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface GetSecretOptions {
  /** Override the default 5-minute cache TTL. Pass 0 to disable caching. */
  ttlMs?: number;
}

/**
 * Retrieve a secret by name.
 *
 * Resolution order:
 *   1. In-memory cache (respects TTL)
 *   2. Supabase Vault (when SUPABASE_VAULT_ENABLED=true)
 *   3. Environment variable
 *
 * Returns `null` if the secret is absent from all sources.
 */
export async function getSecret(
  name: string,
  options: GetSecretOptions = {},
): Promise<string | null> {
  const ttlMs = options.ttlMs ?? DEFAULT_CACHE_TTL_MS;

  // 1. Check cache
  if (ttlMs > 0) {
    const cached = secretCache.get(name);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
  }

  // 2. Try Vault
  let value = await getFromVault(name);

  // 3. Fall back to environment variable
  if (value === null) {
    value = Deno.env.get(name) ?? null;
  }

  // 4. Cache and return
  if (value !== null && ttlMs > 0) {
    secretCache.set(name, { value, expiresAt: Date.now() + ttlMs });
  }
  return value;
}

/**
 * Convenience: retrieve a required secret, logging an error and returning
 * `null` if absent.  Callers should return a 500 when this is `null`.
 */
export async function requireSecret(name: string): Promise<string | null> {
  const value = await getSecret(name);
  if (value === null) {
    console.error(`[secrets] Required secret "${name}" is not configured.`);
  }
  return value;
}

/**
 * Retrieve multiple secrets in parallel.
 *
 * Returns a record mapping each name to its value (or `null`).
 */
export async function getSecrets(
  names: string[],
  options: GetSecretOptions = {},
): Promise<Record<string, string | null>> {
  const entries = await Promise.all(
    names.map(async (name) => [name, await getSecret(name, options)] as const),
  );
  return Object.fromEntries(entries);
}

/** Evict a single entry from the cache (useful after rotation). */
export function invalidateCachedSecret(name: string): void {
  secretCache.delete(name);
}

/** Evict all cached entries. */
export function invalidateAllCachedSecrets(): void {
  secretCache.clear();
}
