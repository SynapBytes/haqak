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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `أنت مساعد ذكي لتصنيف وإعادة صياغة شكاوى المواطنين المصريين. مهمتك:
1. إعادة صياغة المشكلة بلغة عربية فصحى واضحة ومختصرة
2. تصنيف المشكلة في واحدة من هذه الفئات: مياه، طرق، مرافق عامة، صحة، نظافة، تعليم، كهرباء، أخرى
3. تلخيص المشكلة في جملة واحدة للنائب
4. تحديد نوع المشكلة: فردية (تخص مواطن واحد) أو جماعية (تخص مجموعة أو منطقة)
5. فحص المحتوى: إذا كان النص يحتوي على ألفاظ غير لائقة أو مسيئة، أعد صياغته بشكل محترم واضبط is_flagged = true

أجب بصيغة JSON فقط بدون أي نص إضافي.`
          },
          {
            role: "user",
            content: `العنوان: ${title}\nالوصف: ${description}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "classify_issue",
              description: "Classify and reformulate a citizen issue",
              parameters: {
                type: "object",
                properties: {
                  refined_title: { type: "string", description: "العنوان المُعاد صياغته بلغة محترمة" },
                  refined_description: { type: "string", description: "الوصف المُعاد صياغته بلغة محترمة" },
                  category: {
                    type: "string",
                    enum: ["مياه", "طرق", "مرافق عامة", "صحة", "نظافة", "تعليم", "كهرباء", "أخرى"]
                  },
                  summary: { type: "string", description: "ملخص في جملة واحدة للنائب" },
                  issue_type: {
                    type: "string",
                    enum: ["individual", "collective"],
                    description: "فردية أو جماعية"
                  },
                  is_flagged: {
                    type: "boolean",
                    description: "هل يحتوي على محتوى غير لائق تم تنقيته"
                  }
                },
                required: ["refined_title", "refined_description", "category", "summary", "issue_type", "is_flagged"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "classify_issue" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "تم تجاوز حد الطلبات، حاول لاحقاً" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "يرجى إضافة رصيد للاستمرار" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No tool call in response");

    const result = JSON.parse(toolCall.function.arguments);

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
