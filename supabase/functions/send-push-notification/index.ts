import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@haqak.org";

async function generateVapidAuth(endpoint: string, p256dh: string, auth: string, payload: string) {
  const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!VAPID_PRIVATE_KEY) throw new Error("VAPID_PRIVATE_KEY not configured");

  const url = new URL(endpoint);
  
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ typ: "JWT", alg: "ES256" }))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
  const jwtPayload = btoa(JSON.stringify({
    aud: `${url.protocol}//${url.host}`,
    exp: now + 86400,
    sub: VAPID_SUBJECT,
  })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const privKeyBytes = Uint8Array.from(
    atob(VAPID_PRIVATE_KEY.replace(/-/g, "+").replace(/_/g, "/") + "==".slice(0, (4 - VAPID_PRIVATE_KEY.length % 4) % 4)),
    c => c.charCodeAt(0)
  );

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    privKeyBytes,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signInput = new TextEncoder().encode(`${header}.${jwtPayload}`);
  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    signInput
  );
  
  const sigArray = new Uint8Array(signature);
  const sig = btoa(String.fromCharCode(...sigArray))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  
  const vapidToken = `${header}.${jwtPayload}.${sig}`;

  return {
    authorization: `vapid t=${vapidToken}, k=${VAPID_PUBLIC_KEY}`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!VAPID_PUBLIC_KEY) {
      return new Response(JSON.stringify({ error: "Push notifications are not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- AUTH CHECK ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // --- ROLE CHECK: only MPs and admins can send push to other users ---
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user_id, title, body, data } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "user_id and title are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If sending to someone else, must be MP or admin
    if (user_id !== callerId) {
      const { data: roleData } = await serviceSupabase
        .from("user_roles")
        .select("role")
        .eq("user_id", callerId)
        .single();

      const { data: profileData } = await serviceSupabase
        .from("profiles")
        .select("is_approved")
        .eq("user_id", callerId)
        .single();

      const isApprovedMp = roleData?.role === "mp" && profileData?.is_approved === true;
      const isAdmin = roleData?.role === "admin";

      if (!isAdmin && !isApprovedMp) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- SEND PUSH ---
    const { data: subscriptions, error: subError } = await serviceSupabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (subError) throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ success: false, reason: "no_subscriptions" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body: body || "", data: data || {} });
    const results = [];

    for (const sub of subscriptions) {
      try {
        const vapidHeaders = await generateVapidAuth(sub.endpoint, sub.p256dh, sub.auth, payload);

        const pushRes = await fetch(sub.endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            TTL: "86400",
            Urgency: "high",
            ...vapidHeaders,
          },
          body: payload,
        });

        if (pushRes.status === 410 || pushRes.status === 404) {
          await serviceSupabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          results.push({ endpoint: sub.endpoint.slice(0, 30), success: false, reason: "expired" });
        } else if (!pushRes.ok) {
          console.error(`Push failed: ${pushRes.status}`);
          results.push({ endpoint: sub.endpoint.slice(0, 30), success: false });
        } else {
          results.push({ endpoint: sub.endpoint.slice(0, 30), success: true });
        }
      } catch (e) {
        console.error(`Push error:`, e);
        results.push({ endpoint: sub.endpoint.slice(0, 30), success: false });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-push-notification error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
