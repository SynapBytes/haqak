import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { title, description, senderName, location } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ 
        status: "accepted", 
        refined_title: title, 
        refined_description: description,
        priority: "normal",
        category: "individual",
        ai_unavailable: true
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- Enhanced System Prompt for Enterprise Grade AI Triage ---
    const systemPrompt = `أنت نظام ذكاء اصطناعي سيادي متطور (Enterprise Grade) لتحليل وتصنيف شكاوى المواطنين.
مهمتك هي معالجة الشكوى واستخراج البيانات التالية بدقة عالية:

1. الفحص الأمني: كشف المحتوى المسيء أو التحريض.
2. التلخيص التلقائي: تلخيص الشكوى في جملة واحدة مركزة للنائب.
3. تحليل المشاعر: تحديد مستوى غضب المواطن (angry, frustrated, neutral, hopeful).
4. تصنيف الأولوية: (critical, high, normal, low).
5. الكشف عن التكرار: استخراج كلمات مفتاحية فريدة للبحث عن شكاوى مماثلة.
6. إعادة الصياغة: تحويل النص إلى لغة رسمية واحترافية.

يجب أن تكون الإجابة بصيغة JSON حصراً:
{
  "status": "accepted" | "rejected",
  "isOffensive": boolean,
  "rejectionReason": string,
  "refined_title": string,
  "refined_description": string,
  "ai_summary": string,
  "sentiment_label": "angry" | "frustrated" | "neutral" | "hopeful",
  "sentiment_score": number (من -1 إلى 1),
  "category": "individual" | "collective",
  "issueCategory": string,
  "priority": "critical" | "high" | "normal" | "low",
  "keywords": string[]
}`;

    const userMessage = `المواطن: ${senderName || "غير معروف"}
العنوان الأصلي: ${title}
الوصف الأصلي: ${description}
الموقع: ${JSON.stringify(location || "غير محدد")}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
      }
    );

    const data = await response.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const result = JSON.parse(resultText);

    // --- Enterprise Logic: Automatic Duplication Check (Collective Issues) ---
    if (result.status === "accepted" && result.keywords) {
        // Logic to check database for similar issues in the same region
        // This would involve a vector search or keyword matching in a real implementation
        // For now, we return the AI's best guess on category
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message, status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
