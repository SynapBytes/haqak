import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { buildParticipantSet } from "../shared/access-control.ts";
import { buildCorsHeaders } from "../shared/cors.ts";
import { requireCsrfToken } from "../shared/csrf.ts";

type NotificationEvent =
  | "issue_submitted"
  | "issue_assigned"
  | "status_changed"
  | "admin_decision"
  | "moderation_update";

interface DispatchRequest {
  recipients: string[];
  issueId?: string;
  event: NotificationEvent;
  status?: string;
  actorName?: string;
  message?: string;
  reason?: string;
  channels?: ("email" | "sms" | "push")[];
}

interface NotificationContent {
  title: string;
  body: string;
}

type DeliveryResult = { success?: boolean; error?: string; skipped?: boolean; reason?: string };
type ProfileContact = { user_id: string; phone?: string | null; contact_phone?: string | null; full_name?: string | null };
interface ContentOptions {
  event: NotificationEvent;
  issueTitle?: string;
  status?: string;
  actorName?: string;
  reason?: string;
  message?: string;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "Haqak <no-reply@haqak.org>";
const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
const TWILIO_PHONE_NUMBER = Deno.env.get("TWILIO_PHONE_NUMBER");
const TWILIO_DEFAULT_COUNTRY_CODE = Deno.env.get("TWILIO_DEFAULT_COUNTRY_CODE") || "+20";

function buildContent(options: ContentOptions): NotificationContent {
  const { event, issueTitle, status, actorName, reason, message } = options;
  switch (event) {
    case "issue_submitted":
      return {
        title: "تم استلام الشكوى",
        body: issueTitle ? `تم استلام شكوى جديدة: ${issueTitle}` : "تم استلام شكواك وسيتم معالجتها.",
      };
    case "issue_assigned":
      return {
        title: "تم إحالة شكوى جديدة",
        body: issueTitle
          ? `${actorName || "مواطن"} أحال الشكوى "${issueTitle}" إليك للمتابعة`
          : "تم إحالة شكوى جديدة للمتابعة.",
      };
    case "status_changed":
      return {
        title: status ? `تحديث حالة الشكوى: ${status}` : "تحديث حالة الشكوى",
        body: issueTitle ? `تم تحديث حالة "${issueTitle}" إلى ${status || "حالة جديدة"}.` : "تم تحديث حالة الشكوى.",
      };
    case "admin_decision":
      return {
        title: reason === "rejected" ? "تم رفض طلبك" : "تمت الموافقة على حسابك",
        body:
          reason === "rejected"
            ? "تم رفض الطلب. يرجى تحديث بياناتك وإعادة التقديم."
            : "تمت الموافقة على حسابك. يمكنك الآن متابعة الصلاحيات الجديدة.",
      };
    case "moderation_update":
      return {
        title: "تحديث إشرافي",
        body: message || "هناك تحديث إشرافي يتعلق بطلبك أو محتواك.",
      };
    default:
      return { title: "إشعار جديد", body: message || "لديك إشعار جديد." };
  }
}

async function sendEmail(to: string, subject: string, body: string) {
  if (!RESEND_API_KEY) return { skipped: true, reason: "RESEND_API_KEY missing" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [to],
        subject,
        text: body,
      }),
    });
    if (!res.ok) {
      const error = await res.text();
      console.error("Resend email error:", error);
      return { success: false, error };
    }
    return { success: true };
  } catch (error) {
    console.error("Resend exception:", error);
    return { success: false, error: String(error) };
  }
}

async function sendSms(to: string, body: string) {
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    return { skipped: true, reason: "Twilio not configured" };
  }
  try {
    // Assumes local numbers start with a single leading 0 (Egypt-style). Adjust TWILIO_DEFAULT_COUNTRY_CODE if needed.
    const formattedPhone = to.startsWith("+") ? to : `${TWILIO_DEFAULT_COUNTRY_CODE}${to.replace(/^0/, "")}`;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: TWILIO_PHONE_NUMBER,
          To: formattedPhone,
          Body: body,
        }).toString(),
      },
    );
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio SMS error:", errorText);
      return { success: false, error: errorText };
    }
    return { success: true };
  } catch (error) {
    console.error("Twilio exception:", error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { recipients, issueId, event, status, actorName, message, reason, channels }: DispatchRequest =
      await req.json();

    if (!recipients || recipients.length === 0 || !event) {
      return new Response(
        JSON.stringify({ error: "recipients and event are required" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    // VULN-10: CSRF protection on notification dispatch
    const csrfError = requireCsrfToken(req, cors);
    if (csrfError) return csrfError;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.slice("Bearer ".length);
    const {
      data: { user },
    } = await supabase.auth.getUser(token);

    if (!user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"]);
    if (roleError) {
      console.error("Failed to load roles", roleError);
      return new Response(
        JSON.stringify({ error: "Unable to verify permissions" }),
        { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }
    const roles = new Set(roleRows?.map((r) => r.role) ?? []);
    const isAdminOrModerator = roles.has("admin") || roles.has("moderator");

    let issueTitle: string | undefined;
    if (issueId) {
      const { data: issueData, error: issueError } = await supabase
        .from("issues")
        .select("id, title, user_id, assigned_mp_id")
        .eq("id", issueId)
        .single();

      if (issueError || !issueData) {
        return new Response(
          JSON.stringify({ error: "Issue not found" }),
          { status: 404, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      issueTitle = issueData.title;
      const allowedRecipients = buildParticipantSet(issueData.user_id, issueData.assigned_mp_id);
      const isIssueParticipant = allowedRecipients.has(user.id);

      if (!isAdminOrModerator && !isIssueParticipant) {
        return new Response(
          JSON.stringify({ error: "Forbidden" }),
          { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      if (!isAdminOrModerator) {
        const unauthorized = recipients.some((id) => !allowedRecipients.has(id));
        if (unauthorized) {
          return new Response(
            JSON.stringify({ error: "Recipients not allowed" }),
            { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
          );
        }
      }
    } else if (!isAdminOrModerator) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const enabledChannels = new Set(channels ?? ["push", "email"]);
    const content = buildContent({ event, issueTitle, status, actorName, reason, message });
    const deliveryResults: Record<string, DeliveryResult> = {};
    const { data: profileData } = await supabase
      .from("profiles")
      .select("user_id, phone, contact_phone, full_name")
      .in("user_id", recipients);
    const profiles = (profileData ?? []) as ProfileContact[];

    const eventName = event;
    // Idempotency: 1-hour window per (event, recipient, issue)
    const hourSlot = Math.floor(Date.now() / 3_600_000);

    for (const recipient of recipients) {
      const profile = profiles.find((p) => p.user_id === recipient);
      const phone = profile?.phone || profile?.contact_phone || undefined;
      let email: string | undefined;

      try {
        const userRes = await supabase.auth.admin.getUserById(recipient);
        email = userRes.data.user?.email;
      } catch (err) {
        console.error("Failed to fetch user email", err);
      }

      const dedupKey = `${eventName}:${recipient}:${issueId ?? ""}:${hourSlot}`;
      const { data: notifData, error: notifError } = await supabase
        .from("notifications")
        .insert({ user_id: recipient, title: content.title, message: content.body, issue_id: issueId, dedup_key: dedupKey })
        .select("id")
        .maybeSingle();

      if (notifError) {
        // 23505 = unique_violation: dedup_key already exists, skip this window
        if (notifError.code === "23505") {
          // Unique constraint violation: already sent in this window — skip external delivery
          deliveryResults[`${recipient}-dedup`] = { skipped: true, reason: "duplicate_in_window" };
          continue;
        }
        console.error(`Failed to insert notification for ${recipient} (${eventName})`, notifError);
      }

      const notifId: string | undefined = notifData?.id;
      const recipientResults: Record<string, DeliveryResult> = {};

      if (enabledChannels.has("email") && email) {
        recipientResults[`${recipient}-email`] = await sendEmail(email, content.title, content.body);
      }

      if (enabledChannels.has("sms") && phone) {
        recipientResults[`${recipient}-sms`] = await sendSms(phone, content.body);
      }

      if (enabledChannels.has("push")) {
        try {
          const { error: pushError } = await supabase.functions.invoke("send-push-notification", {
            body: { user_id: recipient, title: content.title, body: content.body, data: { issue_id: issueId } },
          });
          if (pushError) {
            recipientResults[`${recipient}-push`] = { success: false, error: pushError.message };
          } else {
            recipientResults[`${recipient}-push`] = { success: true };
          }
        } catch (err) {
          console.error("Push invocation error:", err);
          recipientResults[`${recipient}-push`] = { success: false, error: String(err) };
        }
      }

      // Audit: log each notification dispatch to the audit trail
      // A result is considered a failure if success is explicitly false OR if the
      // result has an error property (covers cases where success field is absent).
      const anyFailure = Object.values(recipientResults).some(
        (r) => r.success === false || (r.error !== undefined && !r.skipped),
      );
      const auditInsert = async () => {
        try {
          await supabase
            .from("notifications")
            .insert({
              user_id: user.id,
              title: `notification_dispatched: ${eventName}`,
              message: JSON.stringify({ recipient, issue_id: issueId ?? null, channels: Array.from(enabledChannels), status: anyFailure ? "failure" : "success" }),
            });
        } catch (err: unknown) {
          console.error("Audit log insert failed", err);
        }
      };
      auditInsert();

      Object.assign(deliveryResults, recipientResults);
    }

    return new Response(
      JSON.stringify({ success: true, results: deliveryResults }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Dispatch error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
