import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { buildCorsHeaders } from "../shared/cors.ts";

interface TrackingResponse {
  success: boolean;
  issueId?: string;
  recipientType?: string;
  redirectUrl?: string;
  error?: string;
}

serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    // Get short code from query parameters
    const url = new URL(req.url);
    const shortCode = url.searchParams.get("code");

    if (!shortCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing tracking code" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find tracking link
    const { data: trackingLink, error: linkError } = await supabase
      .from("sms_tracking_links")
      .select("*")
      .eq("short_code", shortCode)
      .single();

    if (linkError || !trackingLink) {
      return new Response(
        JSON.stringify({ success: false, error: "Tracking link not found" }),
        { status: 404, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Extract user agent and IP.
    // VULN-11 fix: sanitize both values before storing in the database to
    // prevent stored XSS if an admin dashboard renders them as HTML.
    const MAX_UA_LEN = 512;
    const MAX_IP_LEN = 45;
    function sanitizeHeader(value: string | null, maxLen: number): string {
      if (!value) return "unknown";
      const withoutHtmlChars = value.replace(/[<>"'&]/g, "");
      const withoutControlChars = Array.from(withoutHtmlChars)
        .filter((ch) => {
          const code = ch.charCodeAt(0);
          return code >= 0x20 && code !== 0x7f;
        })
        .join("");
      return withoutControlChars.slice(0, maxLen);
    }
    const userAgent = sanitizeHeader(req.headers.get("user-agent"), MAX_UA_LEN);
    const ipAddress = sanitizeHeader(
      req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip"),
      MAX_IP_LEN,
    );

    // Update click tracking
    const now = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      click_count: (trackingLink.click_count || 0) + 1,
      last_clicked_at: now,
      user_agent: userAgent,
      ip_address: ipAddress,
    };

    // Set first_clicked_at if not already set
    if (!trackingLink.first_clicked_at) {
      updateData.first_clicked_at = now;
    }

    const { error: updateError } = await supabase
      .from("sms_tracking_links")
      .update(updateData)
      .eq("id", trackingLink.id);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    // Log the click event for analytics
    try {
      await supabase.from("audit_logs").insert({
        user_id: trackingLink.recipient_id,
        action: "sms_link_clicked",
        entity_type: "sms_tracking_link",
        entity_id: trackingLink.id,
        new_values: {
          click_count: (trackingLink.click_count || 0) + 1,
          clicked_at: now,
        },
        ip_address: ipAddress,
        user_agent: userAgent,
      });
    } catch (error) {
      console.error("Audit log error:", error);
    }

    // Get issue details for redirect
    const { data: issue } = await supabase
      .from("issues")
      .select("id, status")
      .eq("id", trackingLink.issue_id)
      .single();

    // Redirect to issue details page
    const redirectUrl = `${supabaseUrl.replace(/\/$/, "")}/issues/${trackingLink.issue_id}`;

    return new Response(
      JSON.stringify({
        success: true,
        issueId: trackingLink.issue_id,
        recipientType: trackingLink.recipient_type,
        redirectUrl,
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
