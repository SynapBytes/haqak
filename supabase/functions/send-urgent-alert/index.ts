import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

// Urgent keywords for detection
const CRITICAL_KEYWORDS = ["قتل", "اغتصاب", "عنف مسلح", "كارثة", "حريق"];
const HIGH_KEYWORDS = ["عنف", "تهديد", "حادث", "طوارئ"];
const MEDIUM_KEYWORDS = ["مشكلة خطيرة", "حالة حرجة", "عاجل"];

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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as SendUrgentAlertRequest;
    const { issueId, title, description, urgencyLevel, assignedMpId } = body;

    // Validate input
    if (!issueId || !title || !description) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioPhoneNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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

    // Get phone numbers for notifications
    const { data: mpProfiles } = await supabase
      .from("profiles")
      .select("user_id, phone")
      .in("user_id", mpIds);

    const { data: adminProfiles } = await supabase
      .from("profiles")
      .select("user_id, phone")
      .in("user_id", adminIds);

    const notificationRecipients = [
      ...(mpProfiles || []).map((p) => ({ userId: p.user_id, phone: p.phone, type: "mp" })),
      ...(adminProfiles || []).map((p) => ({ userId: p.user_id, phone: p.phone, type: "admin" })),
    ];

    // Send SMS notifications
    let notifiedCount = 0;
    const urgencyEmoji = urgencyLevel === "critical" ? "🚨" : urgencyLevel === "high" ? "⚠️" : "ℹ️";

    for (const recipient of notificationRecipients) {
      const message = `${urgencyEmoji} تنبيه عاجل من حقك:\n${title}\nالأولوية: ${urgencyLevel}\nتابع: https://haqak.org/issues/${issueId}`;

      // Send via Twilio
      if (twilioAccountSid && twilioAuthToken && twilioPhoneNumber) {
        try {
          const formattedPhone = recipient.phone.startsWith("+") ? recipient.phone : `+20${recipient.phone.replace(/^0/, "")}`;

          const response = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`,
            {
              method: "POST",
              headers: {
                Authorization: `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                From: twilioPhoneNumber,
                To: formattedPhone,
                Body: message,
              }).toString(),
            }
          );

          if (response.ok) {
            notifiedCount++;

            // Log SMS notification
            await supabase.from("sms_notifications").insert({
              issue_id: issueId,
              recipient_phone: formattedPhone,
              message_body: message,
              message_type: "urgent_alert",
              status: "sent",
            });
          }
        } catch (error) {
          console.error("SMS sending error:", error);
        }
      }
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
