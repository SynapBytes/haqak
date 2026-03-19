import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description } = await req.json();
    if (!title || !description) {
      return new Response(JSON.stringify({ error: "title and description required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `أنت مساعد ذكي لتصنيف وإعادة صياغة شكاوى المواطنين المصريين. مهمتك:
1. إعادة صياغة المشكلة بلغة عربية فصحى واضحة ومختصرة
2. تصنيف المشكلة في واحدة من هذه الفئات: مياه، طرق، مرافق عامة، صحة، نظافة، تعليم، كهرباء، أخرى
3. تلخيص المشكلة في جملة واحدة للنائب
4. تحديد نوع المشكلة: فردية (تخص مواطن واحد) أو جماعية (تخص مجموعة أو منطقة)
5. فحص المحتوى: إذا كان النص يحتوي على ألفاظ غير لائقة أو مسيئة، أعد صياغته بشكل محترم واضبط is_flagged = true

أجب بصيغة JSON فقط بالشكل التالي:
{
  "refined_title": "العنوان المُعاد صياغته",
  "refined_description": "الوصف المُعاد صياغته",
  "category": "الفئة",
  "summary": "ملخص في جملة واحدة",
  "issue_type": "individual أو collective",
  "is_flagged": true أو false
}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\nالعنوان: ${title}\nالوصف: ${description}` }],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error("Gemini API error:", response.status, errText);

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textContent) throw new Error("No content in Gemini response");

    const result = JSON.parse(textContent);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("classify-issue error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
