import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders } from "../shared/cors.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";

/**
 * Compute a SHA-256 hex digest of `data`.
 */
async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/i;
const UUID_V1_TO_V5_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"), true);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized", valid: false }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // VULN-04 fix: validate the JWT as a hard access gate before any business
    // logic.  Previously getUser() was only called inside the audit-log block
    // after all work was done (non-blocking, best-effort audit only).
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", valid: false }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { storagePath, expectedHash } = await req.json();

    if (typeof storagePath !== "string" || typeof expectedHash !== "string") {
      return new Response(
        JSON.stringify({ error: "storagePath and expectedHash are required", valid: false }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const normalizedStoragePath = storagePath.trim();
    const normalizedExpectedHash = expectedHash.trim().toLowerCase();
    const pathParts = normalizedStoragePath.split("/");

    if (
      !normalizedStoragePath ||
      normalizedStoragePath.length > 512 ||
      normalizedStoragePath.includes("..") ||
      pathParts.length < 3 ||
      !UUID_V1_TO_V5_REGEX.test(pathParts[0])
    ) {
      return new Response(
        JSON.stringify({ error: "Invalid storagePath", valid: false }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (!SHA256_HEX_REGEX.test(normalizedExpectedHash)) {
      return new Response(
        JSON.stringify({ error: "Invalid expectedHash", valid: false }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    if (pathParts[0] !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden", valid: false }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const ipAddress =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "0.0.0.0";

    try {
      await rateLimiter(supabase, user.id, "/verify-upload-integrity", ipAddress, 200, {
        maxRequests: 20,
        windowMinutes: 5,
      });
    } catch (rateError) {
      if (rateError instanceof RateLimitError) {
        return new Response(JSON.stringify({
          error: rateError.reason === "storage_error"
            ? "Rate limiting is temporarily unavailable. Please retry shortly."
            : "Too many requests",
          valid: false,
        }), {
          status: rateError.reason === "storage_error" ? 503 : 429,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            "Retry-After": String(rateError.retryAfterSeconds),
          },
        });
      }
      throw rateError;
    }

    // Create a signed URL so we can download the file server-side
    const { data: signedData, error: signedError } = await supabase.storage
      .from("issue-attachments")
      .createSignedUrl(normalizedStoragePath, 30); // 30-second expiry

    if (signedError || !signedData?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "Could not generate signed URL for integrity check", valid: false }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Download the stored file and compute its hash
    const response = await fetch(signedData.signedUrl);
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch stored file: HTTP ${response.status}`, valid: false }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const buffer = await response.arrayBuffer();
    const actualHash = await sha256Hex(buffer);

    if (actualHash !== normalizedExpectedHash) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "File integrity check failed: stored hash does not match expected hash",
        }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ valid: true, hash: actualHash }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("verify-upload-integrity error:", e);
    return new Response(JSON.stringify({ error: "Internal server error", valid: false }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
