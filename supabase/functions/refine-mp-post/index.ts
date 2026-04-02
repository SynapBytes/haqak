import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import {
  AI_TEXT_INPUT_LIMIT,
  MAX_AI_REQUEST_BODY_BYTES,
  refineProjectProposal,
} from "../shared/ai-service.ts";
import { buildCorsHeaders } from "../shared/cors.ts";
import { requireCsrfToken } from "../shared/csrf.ts";
import { rateLimiter } from "../shared/rate-limiter.ts";

const MAX_TITLE_LENGTH = AI_TEXT_INPUT_LIMIT;
const MAX_BODY_LENGTH = 3000;
const DEFAULT_POST_TITLE = "منشور عام";

const IPV4_REGEX =
  /^(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.(25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/;

const isValidIpv6 = (value: string): boolean => {
  if (!value || value.length > 45 || !value.includes(":")) return false;

  const compressedMarkerCount = value.includes("::")
    ? value.split("::").length - 1
    : 0;
  if (compressedMarkerCount > 1) return false;

  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 8) return false;

  let emptySegments = 0;
  for (const part of parts) {
    if (part === "") {
      emptySegments += 1;
      continue;
    }

    if (part.length > 4) return false;
    for (const ch of part) {
      const isHex =
        (ch >= "0" && ch <= "9") ||
        (ch >= "a" && ch <= "f") ||
        (ch >= "A" && ch <= "F");
      if (!isHex) return false;
    }
  }

  if (compressedMarkerCount === 0 && emptySegments > 0) return false;
  if (compressedMarkerCount === 0 && parts.length !== 8) return false;
  if (compressedMarkerCount === 1 && parts.length > 8) return false;

  return true;
};

const normalizeClientIp = (req: Request): string => {
  const candidate =
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "";

  if (IPV4_REGEX.test(candidate) || isValidIpv6(candidate)) {
    return candidate;
  }

  return "0.0.0.0";
};

serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"), true);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: missing Supabase credentials" }),
        {
          status: 503,
          headers: { ...cors, "Content-Type": "application/json" },
        },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("verification_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile?.verification_status !== "verified") {
      return new Response(JSON.stringify({ error: "Verified MP account required" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const ipAddress = normalizeClientIp(req);
    await rateLimiter(supabase, user.id, "refine-mp-post", ipAddress);

    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader && Number(contentLengthHeader) > MAX_AI_REQUEST_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_AI_REQUEST_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    let parsedBody: Record<string, unknown> = {};
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { title = "", body = "" } = parsedBody;

    const normalizedTitle = typeof title === "string" ? title.trim().slice(0, MAX_TITLE_LENGTH) : "";
    const normalizedBody = typeof body === "string" ? body.trim().slice(0, MAX_BODY_LENGTH) : "";

    if (!normalizedBody) {
      return new Response(JSON.stringify({ error: "body is required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { result, meta } = await refineProjectProposal({
      title: normalizedTitle || DEFAULT_POST_TITLE,
      description: normalizedBody,
      category: "mp_public_post",
      location: "Egypt",
      targetAmount: 1,
    });

    return new Response(
      JSON.stringify({
        refined_title: result.refinedTitle,
        refined_body: result.refinedDescription,
        ai_meta: {
          provider: meta.provider,
          model: meta.model,
          timestamp: meta.timestamp,
          note: "Arabic-first MP public post refinement",
          unavailable: meta.unavailable ?? false,
        },
      }),
      {
        headers: { ...cors, "Content-Type": "application/json" },
      },
    );
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Rate limit exceeded")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message, status: "error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
