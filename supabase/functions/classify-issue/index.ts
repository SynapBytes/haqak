import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { classifyIssue, AI_TEXT_INPUT_LIMIT, MAX_AI_REQUEST_BODY_BYTES } from "../shared/ai-service.ts";
import { rateLimiter } from "../shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MAX_TITLE_LENGTH_BEFORE_AI = AI_TEXT_INPUT_LIMIT;
const MAX_DESCRIPTION_LENGTH_BEFORE_AI = 3000;
const MAX_SENDER_NAME_LENGTH = 400;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── FIX #2: CSRF protection — require custom header ───────────────────────
    // The browser same-origin policy prevents cross-origin pages from setting
    // custom request headers, so the presence of X-CSRF-Token proves the request
    // originates from our own frontend.
    const csrfToken = req.headers.get("X-CSRF-Token");
    if (!csrfToken || csrfToken.trim() === "") {
      return new Response(JSON.stringify({ error: "Forbidden: missing CSRF token" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ipAddress =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    await rateLimiter(supabase, user.id, "classify-issue", ipAddress);

    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader && Number(contentLengthHeader) > MAX_AI_REQUEST_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_AI_REQUEST_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedBody: any = {};
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { title = "", description = "", senderName = "", location = null } = parsedBody;

    const normalizedTitle = typeof title === "string" ? title : "";
    const normalizedDescription = typeof description === "string" ? description : "";

    if (!normalizedTitle.trim() || !normalizedDescription.trim()) {
      return new Response(JSON.stringify({ error: "title and description are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const trimmedTitle = normalizedTitle.slice(0, MAX_TITLE_LENGTH_BEFORE_AI);
    const trimmedDescription = normalizedDescription.slice(0, MAX_DESCRIPTION_LENGTH_BEFORE_AI);
    const safeSenderName = typeof senderName === "string" ? senderName.slice(0, MAX_SENDER_NAME_LENGTH) : "";
    const safeLocation = typeof location === "object" || typeof location === "string" ? location : null;

    const { result, meta } = await classifyIssue({
      title: trimmedTitle,
      description: trimmedDescription,
      senderName: safeSenderName,
      location: safeLocation,
    });

    return new Response(JSON.stringify({ ...result, ai_meta: meta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Rate limit exceeded")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
