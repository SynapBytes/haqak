import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, description, senderName, files } = await req.json();
    if (!title || !description) {
      return new Response(JSON.stringify({ error: "title and description required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If no sender name, reject immediately
    if (!senderName || senderName.trim() === "") {
      return new Response(JSON.stringify({
        status: "rejected",
        rejectionReason: "الاسم الكامل للمرسل غير موجود. يجب تسجيل الدخول بحساب يحتوي على الاسم الكامل.",
        senderName: null,
        text: null,
        category: null,
        priority: null,
        files: files || [],
        foulWordsRemoved: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const filesInfo = (files && files.length > 0)
      ? `\n\nالملفات المرفقة:\n${files.map((f: any) => `- ${f.fileName} (${f.fileType})`).join("\n")}`
      : "";

    const systemPrompt = `أنت مساعد ذكي لمعالجة شكاوى المواطنين المصريين قبل إرسالها للنواب. هدفك تحويل أي شكوى إلى نص واضح، مختصر، رسمي، وجاهز للعرض للنائب.

القواعد:
1. الاسم الكامل للمرسل مطلوب. إذا كان فارغاً أو غير موجود، ارجع status: "rejected" مع سبب الرفض.

2. أي محتوى مسيء، شتائم، سب، استهزاء، أو طلب فلوس مباشرة يجب أن يُحجب تلقائياً ويُعاد صياغته بشكل محترم. اضبط foulWordsRemoved = true في هذه الحالة.

3. كل شكوى طويلة أو معقدة يجب أن تُعاد صياغتها في نقاط مختصرة وواضحة بالعربية الفصحى، بحيث النائب يفهم كل المعلومات الأساسية بسرعة.

4. صنف كل شكوى:
   - "category": "individual" (تخص مواطن واحد) أو "group" (تخص مجموعة أو منطقة)
   - "priority": 
     * "urgent" - مشاكل تحتاج تدخل فوري (خطر على الحياة، كوارث)
     * "humanitarian" - حالات إنسانية (مرض، فقر شديد، إعاقة)
     * "normal" - مشاكل عادية تحتاج متابعة
     * "nonLogical" - طلبات غير منطقية أو غير واقعية

5. أي ملفات مرفقة أشر إليها في JSON باسم الملف ونوعه.

6. صنف المشكلة في واحدة من هذه الفئات: مياه، طرق، مرافق عامة، صحة، نظافة، تعليم، كهرباء، أخرى

أجب بصيغة JSON فقط بالشكل التالي:
{
  "status": "accepted" أو "rejected",
  "rejectionReason": "سبب الرفض إذا كانت مرفوضة، أو null",
  "senderName": "الاسم الكامل للمرسل",
  "refined_title": "العنوان المُعاد صياغته",
  "refined_description": "الوصف المُعاد صياغته في نقاط مختصرة وواضحة",
  "text": "النص الكامل المعاد صياغته جاهز للعرض للنائب",
  "category": "individual" أو "group",
  "issueCategory": "الفئة (مياه، طرق، إلخ)",
  "priority": "urgent" أو "normal" أو "humanitarian" أو "nonLogical",
  "summary": "ملخص في جملة واحدة",
  "files": [{"fileName": "اسم الملف", "fileType": "نوع الملف"}],
  "foulWordsRemoved": true أو false
}`;

    const userMessage = `اسم المرسل: ${senderName}
العنوان: ${title}
الوصف: ${description}${filesInfo}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `${systemPrompt}\n\n${userMessage}` }],
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

    // Ensure files from input are included if AI didn't return them
    if (files && files.length > 0 && (!result.files || result.files.length === 0)) {
      result.files = files;
    }

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
