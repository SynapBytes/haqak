import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { buildCorsHeaders } from "../shared/cors.ts";
import { requireCsrfToken } from "../shared/csrf.ts";

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req.headers.get("Origin"));
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // VULN-02 fix: require authenticated admin/moderator (was completely unauthenticated)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // VULN-10: CSRF protection for this state-sensitive intelligence endpoint
    const csrfError = requireCsrfToken(req, cors);
    if (csrfError) return csrfError;

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "moderator"]);
    if (!roleRows?.length) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentIssues, error } = await supabase
      .from("issues")
      .select("id, category, location, created_at")
      .gte("created_at", oneDayAgo);

    if (error) throw error;

    const grouped = new Map<string, number>();
    for (const issue of recentIssues ?? []) {
      const key = `${issue.category}|${issue.location}`;
      grouped.set(key, (grouped.get(key) ?? 0) + 1);
    }

    const anomalies = Array.from(grouped.entries())
      .filter(([, count]) => count >= 3)
      .map(([key, count]) => {
        const [category, location] = key.split("|");
        return {
          category,
          location,
          issue_count: count,
          summary: `تم رصد ${count} شكاوى من فئة ${category} في ${location} خلال آخر 24 ساعة.`,
        };
      });

    return new Response(
      JSON.stringify({
        status: "success",
        anomalies_detected: anomalies.length,
        anomalies,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, status: "error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
