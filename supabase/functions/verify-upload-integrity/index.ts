import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders } from "../shared/cors.ts";

/**
 * Compute a SHA-256 hex digest of `data`.
 */
async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hashBuf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
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

    if (!storagePath || !expectedHash) {
      return new Response(
        JSON.stringify({ error: "storagePath and expectedHash are required", valid: false }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // Create a signed URL so we can download the file server-side
    const { data: signedData, error: signedError } = await supabase.storage
      .from("issue-attachments")
      .createSignedUrl(storagePath, 30); // 30-second expiry

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

    if (actualHash !== expectedHash) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "File integrity check failed: stored hash does not match expected hash",
          expectedHash,
          actualHash,
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
