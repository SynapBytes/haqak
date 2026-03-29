import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
