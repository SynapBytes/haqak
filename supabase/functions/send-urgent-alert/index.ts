import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildParticipantSet } from "../shared/access-control.ts";
import { buildCorsHeaders } from "../shared/cors.ts";
import { requireCsrfToken } from "../shared/csrf.ts";
import { RateLimitError, rateLimiter } from "../shared/rate-limiter.ts";

interface SendUrgentAlertRequest {
  issueId: string;
  title: string;
  description: string;
  urgencyLevel: "critical" | "high" | "medium";
  assignedMpId?: string;
}

interface UrgentAlertResponse {
  success: boolean;
  alertId?: string;
  notifiedMps?: number;
  notifiedAdmins?: number;
  error?: string;
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_URGENCY_LEVELS = new Set(["critical", "high", "medium"]);
const MAX_TITLE_LENGTH = 200;
const MAX_DESCRIPTION_LENGTH = 4000;

// Urgent keywords for detection
const CRITICAL_KEYWORDS = ["قتل", "اغتصاب", "عنف مسلح", "كارثة", "حريق"];
const HIGH_KEYWORDS = ["عنف", "تهديد", "حادث", "طوارئ"];
const MEDIUM_KEYWORDS = ["مشكلة خطيرة", "حالة حرجة", "عاجل"];
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function detectUrgency(title: string, description: string): { level: string; keywords: string[] } {
  const text = `${title} ${description}`.toLowerCase();
  const detectedKeywords: string[] = [];

  // Check critical keywords
  for (const keyword of CRITICAL_KEYWORDS) {
    if (text.includes(keyword)) {
      detectedKeywords.push(keyword);
    }
  }

  if (detectedKeywords.length > 0) {
    return { level: "critical", keywords: detectedKeywords };
  }

  // Check high keywords
  for (const keyword of HIGH_KEYWORDS) {
    if (text.includes(keyword)) {
      detectedKeywords.push(keyword);
    }
  }

  if (detectedKeywords.length > 0) {
    return { level: "high", keywords: detectedKeywords };
  }

  // Check medium keywords
  for (const keyword of MEDIUM_KEYWORDS) {
    if (text.includes(keyword)) {
      detectedKeywords.push(keyword);
    }
  }

  if (detectedKeywords.length > 0) {
    return { level: "medium", keywords: detectedKeywords };
  }

  return { level: "low", keywords: [] };
}

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const body = (await req.json()) as SendUrgentAlertRequest;
    const { issueId, title, description, urgencyLevel, assignedMpId } = body;

    // Validate input
    if (!issueId || !title || !description) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
    if (!UUID_REGEX.test(issueId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid issueId" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (
      !UUID_REGEX.test(issueId) ||
      typeof title !== "string" ||
      typeof description !== "string" ||
      title.length > MAX_TITLE_LENGTH ||
      description.length > MAX_DESCRIPTION_LENGTH ||
      (urgencyLevel !== undefined && !ALLOWED_URGENCY_LEVELS.has(urgencyLevel))
    ) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid request fields" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    if (assignedMpId && !UUID_REGEX.test(assignedMpId)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid assignedMpId" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // VULN-10: CSRF protection on urgent alert dispatch
    const csrfError = requireCsrfToken(req, cors);
    if (csrfError) return csrfError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.slice("Bearer ".length);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "0.0.0.0";

    try {
      await rateLimiter(supabase, user.id, "/send-urgent-alert", clientIp, 200, {
        maxRequests: 10,
        windowMinutes: 10,
      });
    } catch (rateError) {
      if (rateError instanceof RateLimitError) {
        return new Response(JSON.stringify({
          success: false,
          error: rateError.reason === "storage_error"
            ? "Rate limiting is temporarily unavailable. Please retry shortly."
            : "Too many requests",
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

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"]);
    if (roleError) {
      console.error("Failed to load roles", roleError);
      return new Response(
        JSON.stringify({ success: false, error: "Unable to verify permissions" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }
    const roles = new Set(roleRows?.map((r) => r.role) ?? []);
    const isAdminOrModerator = roles.has("admin") || roles.has("moderator");

    const { data: issueData, error: issueError } = await supabase
      .from("issues")
      .select("user_id, assigned_mp_id")
      .eq("id", issueId)
      .single();

    if (issueError || !issueData) {
      return new Response(
        JSON.stringify({ success: false, error: "Issue not found" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const allowedParticipants = buildParticipantSet(issueData.user_id, issueData.assigned_mp_id);
    const isIssueParticipant = allowedParticipants.has(user.id);
    if (!isAdminOrModerator && !isIssueParticipant) {
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Detect urgency
    const urgency = detectUrgency(title, description);

    // Create urgent alert record
    const { data: alertData, error: alertError } = await supabase
      .from("urgent_issue_alerts")
      .insert({
        issue_id: issueId,
        urgency_level: urgencyLevel || urgency.level,
        urgency_keywords: urgency.keywords,
      })
      .select()
      .single();

    if (alertError) {
      console.error("Alert creation error:", alertError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create alert" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Get assigned MP and admin details
    const { data: mps } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "mp");

    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const mpIds = mps?.map((m) => m.user_id) || [];
    const adminIds = admins?.map((a) => a.user_id) || [];

    // Direct message delivery is deprecated in favor of email/in-app channels.
    const recipientsCount = mpIds.length + adminIds.length;
    if (recipientsCount > 0) {
      console.info("urgent_alert_direct_delivery_deprecated", { recipients: recipientsCount });
    }

    // Update alert with notified users
    await supabase
      .from("urgent_issue_alerts")
      .update({
        notified_mps: mpIds,
        notified_admins: adminIds,
        last_notification_at: new Date().toISOString(),
      })
      .eq("id", alertData.id);

    return new Response(
      JSON.stringify({
        success: true,
        alertId: alertData.id,
        notifiedMps: mpIds.length,
        notifiedAdmins: adminIds.length,
      }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});
