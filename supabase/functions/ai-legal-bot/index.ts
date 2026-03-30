import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userMessage } = await req.json();
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");

    const legalKnowledge = {
      procedures: {
        keywords: ["كيف", "تقديم", "شكوى", "إجراء"],
        response: `لتقديم شكوى في منصة "حقك":\n\n1. اذهب إلى صفحة "تقديم شكوى جديدة"\n2. اختر فئة الشكوى\n3. اكتب عنواناً واضحاً ووصفاً مفصلاً\n4. أضف صوراً أو مستندات إن أمكن\n5. اضغط "إرسال"`,
        references: [{ title: "دليل تقديم الشكاوى" }],
      },
      rights: {
        keywords: ["حقوق", "حق", "مواطن"],
        response: `حقوقك كمواطن تشمل تقديم الطلب، متابعة الحالة، والحصول على تحديثات واضحة على مسار المعالجة داخل المنصة.`,
        references: [{ title: "سياسة الاستخدام" }, { title: "سياسة الخصوصية" }],
      },
      timeline: {
        keywords: ["مدة", "وقت", "متى", "كم"],
        response: `تختلف مدة المعالجة بحسب نوع الطلب وأولويته، لكنك ستجد كل تحديث ظاهرًا مباشرة داخل حسابك.`,
        references: [{ title: "إجراءات معالجة الطلبات" }],
      },
    };

    let response = "";
    let references: Array<{ title: string }> = [];

    for (const knowledge of Object.values(legalKnowledge)) {
      if (knowledge.keywords.some((keyword) => userMessage?.includes(keyword))) {
        response = knowledge.response;
        references = knowledge.references;
        break;
      }
    }

    if (!response && GEMINI_API_KEY) {
      const systemPrompt = `أنت مساعد قانوني ذكي متخصص في القوانين والإجراءات العامة للمواطنين. أجب بالعربية بشكل واضح ومختصر.`;
      const apiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: `${systemPrompt}\n\nالسؤال: ${userMessage}` }],
              },
            ],
            generationConfig: { temperature: 0.3 },
          }),
        },
      );

      const data = await apiResponse.json();
      response =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "عذرًا، تعذر توليد رد الآن. حاول مرة أخرى بعد قليل.";
    }

    if (!response) {
      response = "يمكنني مساعدتك في فهم خطوات التقديم، الحقوق الأساسية، وآلية المتابعة داخل المنصة.";
    }

    return new Response(JSON.stringify({ status: "success", response, references }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
