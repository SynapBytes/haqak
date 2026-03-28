import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateTrackingLinkRequest {
  issueId: string;
  recipientType: "citizen" | "mp" | "admin";
  recipientId: string;
}

interface TrackingLinkResponse {
  success: boolean;
  shortCode?: string;
  trackingUrl?: string;
  linkId?: string;
  error?: string;
}

// Generate unique short code
function generateShortCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as CreateTrackingLinkRequest;
    const { issueId, recipientType, recipientId } = body;

    // Validate input
    if (!issueId || !recipientType || !recipientId) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique short code
    let shortCode = generateShortCode();
    let attempts = 0;
    const maxAttempts = 10;

    // Ensure uniqueness
    while (attempts < maxAttempts) {
      const { data: existing } = await supabase
        .from("sms_tracking_links")
        .select("id")
        .eq("short_code", shortCode)
        .single();

      if (!existing) break;
      shortCode = generateShortCode();
      attempts++;
    }

    if (attempts === maxAttempts) {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to generate unique short code" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create full tracking URL
    const trackingUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/track-sms-click?code=${shortCode}`;

    // Store tracking link in database
    const { data: linkData, error: linkError } = await supabase
      .from("sms_tracking_links")
      .insert({
        issue_id: issueId,
        short_code: shortCode,
        full_url: trackingUrl,
        recipient_type: recipientType,
        recipient_id: recipientId,
      })
      .select()
      .single();

    if (linkError) {
      console.error("Link creation error:", linkError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to create tracking link" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        shortCode,
        trackingUrl,
        linkId: linkData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
