import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders } from "../shared/cors.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";

/** Allowed MIME types and their magic-byte signatures. */
const MAGIC_RULES: Record<string, Array<{ offset: number; bytes: number[] }>> = {
  "application/pdf": [
    { offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  ],
  "image/jpeg": [
    { offset: 0, bytes: [0xff, 0xd8, 0xff] },
  ],
  "image/png": [
    { offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  ],
  "application/msword": [
    { offset: 0, bytes: [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1] },
  ],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [
    { offset: 0, bytes: [0x50, 0x4b, 0x03, 0x04] },
    { offset: 0, bytes: [0x50, 0x4b, 0x05, 0x06] },
  ],
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(MAGIC_RULES));
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_HEADER_BYTES = 16;

function matchesAnyRule(
  header: Uint8Array,
  rules: Array<{ offset: number; bytes: number[] }>,
): boolean {
  return rules.some((rule) =>
    rule.bytes.every((byte, i) => header[rule.offset + i] === byte),
  );
}

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Service unavailable", valid: false }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", valid: false }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const ipAddress =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "0.0.0.0";

    try {
      await rateLimiter(supabase, user.id, "/validate-file-upload", ipAddress, 200, {
        maxRequests: 30,
        windowMinutes: 5,
      });
    } catch (rateError) {
      if (rateError instanceof RateLimitError) {
        return new Response(JSON.stringify({ error: "Too many requests", valid: false }), {
          status: 429,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            "Retry-After": String(rateError.retryAfterSeconds),
          },
        });
      }
      throw rateError;
    }

    // Parse multipart form data
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response(
        JSON.stringify({ error: "Expected multipart/form-data", valid: false }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "No file provided", valid: false }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const declaredMime = file.type || "";
    let rejectionReason: string | null = null;
    let magicBytesOk = false;

    // 1. MIME type allow-list check
    if (!ALLOWED_MIME_TYPES.has(declaredMime)) {
      rejectionReason = `Disallowed MIME type: ${declaredMime}`;
    }

    // 2. File size check
    if (!rejectionReason && file.size > MAX_FILE_SIZE_BYTES) {
      rejectionReason = `File size ${file.size} exceeds the 10 MB limit`;
    }

    // 3. Magic byte check
    if (!rejectionReason) {
      const buffer = await file.slice(0, MAX_HEADER_BYTES).arrayBuffer();
      const header = new Uint8Array(buffer);
      const rules = MAGIC_RULES[declaredMime];
      magicBytesOk = matchesAnyRule(header, rules);
      if (!magicBytesOk) {
        rejectionReason = `File content does not match declared MIME type (${declaredMime})`;
      }
    }

    const isValid = rejectionReason === null;

    // Audit log (best-effort)
    await supabase.from("file_validation_log").insert({
      file_name: file.name,
      file_size: file.size,
      declared_mime: declaredMime,
      magic_bytes_ok: magicBytesOk,
      is_valid: isValid,
      rejection_reason: rejectionReason,
      user_id: user.id,
    }).then(({ error }) => {
      if (error) console.warn("file_validation_log insert error:", error.message);
    });

    if (!isValid) {
      return new Response(
        JSON.stringify({ valid: false, error: rejectionReason }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ valid: true, mimeType: declaredMime, fileName: file.name }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("validate-file-upload error:", e);
    return new Response(JSON.stringify({ error: "Internal server error", valid: false }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
