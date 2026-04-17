import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders } from "../shared/cors.ts";
import { requireCsrfToken } from "../shared/csrf.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";

interface VerifyIdentityOcrRequest {
  verification_id: string;
  front_path?: string;
  back_path?: string;
  front_base64?: string;
  back_base64?: string;
}

interface ExtractedFields {
  full_name_ar: string | null;
  national_id_number: string | null;
  birth_date: string | null;
  governorate: string | null;
  center: string | null;
  manual_review_required: boolean;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OCR_PROVIDER = Deno.env.get("OCR_PROVIDER") ?? "stub";

function safeExtractFromText(text: string): ExtractedFields {
  const normalized = text.replace(/\s+/g, " ").trim();
  const idMatch = normalized.match(/\b\d{14}\b/);
  const dateMatch = normalized.match(/\b(?:19|20)\d{2}[/.-](?:0?[1-9]|1[0-2])[/.-](?:0?[1-9]|[12]\d|3[01])\b/);
  const arabicNameMatch = normalized.match(/[\u0600-\u06FF]{2,}(?:\s+[\u0600-\u06FF]{2,}){1,5}/);

  return {
    full_name_ar: arabicNameMatch?.[0] ?? null,
    national_id_number: idMatch?.[0] ?? null,
    birth_date: dateMatch?.[0] ?? null,
    governorate: null,
    center: null,
    manual_review_required: true,
  };
}

async function readStorageObjectAsText(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  path: string,
): Promise<string> {
  if (path.includes('..')) throw new Error('Invalid path');
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error || !data) return "";
  const arr = await data.arrayBuffer();
  if (arr.byteLength === 0) return "";
  const decoder = new TextDecoder();
  return decoder.decode(arr);
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const csrfError = requireCsrfToken(req, cors);
    if (csrfError) return csrfError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceRoleKey) {
      return new Response(JSON.stringify({ error: "Server configuration error" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    const token = authHeader.slice("Bearer ".length);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const clientIp =
      req.headers.get("CF-Connecting-IP") ??
      req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
      "0.0.0.0";

    try {
      await rateLimiter(supabase, user.id, "/verify-identity-ocr", clientIp, 200, {
        maxRequests: 15,
        windowMinutes: 5,
      });
    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(JSON.stringify({
          error: error.reason === "storage_error"
            ? "Rate limiting is temporarily unavailable. Please retry shortly."
            : "Too many requests",
        }), {
          status: error.reason === "storage_error" ? 503 : 429,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            "Retry-After": String(error.retryAfterSeconds),
          },
        });
      }
      throw error;
    }

    const body = (await req.json()) as VerifyIdentityOcrRequest;
    if (!body.verification_id || !UUID_REGEX.test(body.verification_id)) {
      return new Response(JSON.stringify({ error: "Invalid verification_id" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin"]);
    const isAdmin = (roleRows ?? []).some((r) => r.role === "admin");

    const { data: verification, error: verificationError } = await supabase
      .from("identity_verifications")
      .select("id, user_id, id_front_path, id_back_path, status")
      .eq("id", body.verification_id)
      .single();

    if (verificationError || !verification) {
      return new Response(JSON.stringify({ error: "Verification not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (!isAdmin && verification.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const frontPath = body.front_path ?? verification.id_front_path;
    const backPath = body.back_path ?? verification.id_back_path;

    let extractedFields: ExtractedFields = {
      full_name_ar: null,
      national_id_number: null,
      birth_date: null,
      governorate: null,
      center: null,
      manual_review_required: true,
    };

    let rawOcrJson: Record<string, unknown> = {
      provider: OCR_PROVIDER,
      manual_review_required: true,
    };

    if (OCR_PROVIDER === "stub") {
      const inferredText =
        (body.front_base64 ? "front_base64_supplied " : "") +
        (body.back_base64 ? "back_base64_supplied " : "") +
        (frontPath ? "front_path_supplied " : "") +
        (backPath ? "back_path_supplied" : "");
      extractedFields = safeExtractFromText(inferredText);
      rawOcrJson = {
        provider: "stub",
        note: "No OCR provider configured. Manual review required.",
      };
    } else {
      await readStorageObjectAsText(supabase, "id_verifications", frontPath);
      await readStorageObjectAsText(supabase, "id_verifications", backPath);
      extractedFields = {
        full_name_ar: null,
        national_id_number: null,
        birth_date: null,
        governorate: null,
        center: null,
        manual_review_required: true,
      };
      rawOcrJson = {
        provider: OCR_PROVIDER,
        note: "Provider hook configured but parser is currently conservative; manual review required.",
      };
    }

    const { error: updateError } = await supabase
      .from("identity_verifications")
      .update({
        ocr_provider: OCR_PROVIDER,
        ocr_raw_json: rawOcrJson,
        extracted_fields_json: extractedFields,
      })
      .eq("id", verification.id);

    if (updateError) {
      return new Response(JSON.stringify({ error: "Failed to update OCR result" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        provider: OCR_PROVIDER,
        extracted_fields: extractedFields,
        manual_review_required: extractedFields.manual_review_required,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
