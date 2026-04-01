import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { draftAssistantReply, type AiMeta, AI_TEXT_INPUT_LIMIT, MAX_AI_REQUEST_BODY_BYTES } from "../shared/ai-service.ts";
import { rateLimiter } from "../shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_ASSISTANT_INPUT_LENGTH = AI_TEXT_INPUT_LIMIT;

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

    const contentLengthHeader = req.headers.get("content-length");
    if (contentLengthHeader && Number(contentLengthHeader) > MAX_AI_REQUEST_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawBody = await req.text();
    if (rawBody.length > MAX_AI_REQUEST_BODY_BYTES) {
      return new Response(JSON.stringify({ error: "Payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsedBody: Record<string, unknown> = {};
    try {
      parsedBody = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userMessage } = parsedBody;
    const ipAddress =
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";

    await rateLimiter(supabase, user.id, "ai-legal-bot", ipAddress);

    const normalizedMessage = typeof userMessage === "string" ? userMessage.trim() : "";
    if (!normalizedMessage) {
      return new Response(JSON.stringify({ error: "userMessage is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const clippedMessage = normalizedMessage.slice(0, MAX_ASSISTANT_INPUT_LENGTH);

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

    let aiMeta: AiMeta | undefined;

    if (!response) {
      const { reply, meta } = await draftAssistantReply({
        question: clippedMessage,
        tone: "concise",
      });
      response =
        reply ||
        "يمكنني مساعدتك في فهم خطوات التقديم، الحقوق الأساسية، وآلية المتابعة داخل المنصة.";
      aiMeta = meta;
    }

    if (!response) {
      response = "يمكنني مساعدتك في فهم خطوات التقديم، الحقوق الأساسية، وآلية المتابعة داخل المنصة.";
    }

    return new Response(JSON.stringify({ status: "success", response, references, ai_meta: aiMeta }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes("Rate limit exceeded")) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg, status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
