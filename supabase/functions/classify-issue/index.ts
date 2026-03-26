import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth check ---
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
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized", status: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // --- Check ban status ---
    const { data: profileData } = await supabase
      .from("profiles")
      .select("banned_until, is_permanently_banned")
      .eq("user_id", userId)
      .single();
    
    if (profileData?.is_permanently_banned) {
      return new Response(JSON.stringify({
        status: "rejected",
        rejectionReason: "تم حظر حسابك نهائياً من المنصة بسبب تكرار الانتهاكات.",
        isBanned: true,
        permanent: true
      }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (profileData?.banned_until) {
      const bannedUntil = new Date(profileData.banned_until);
      if (bannedUntil > new Date()) {
        const options: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = bannedUntil.toLocaleDateString('ar-EG', options);
        return new Response(JSON.stringify({
          status: "rejected",
          rejectionReason: `حسابك موقوف مؤقتاً بسبب انتهاك سياسة المحتوى. يمكنك المحاولة مرة أخرى بعد: ${dateStr}`,
          isBanned: true,
          bannedUntil: profileData.banned_until
        }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // --- Input validation ---
    const { title, description, senderName, files } = await req.json();
    if (!title || !description) {
      return new Response(JSON.stringify({ error: "title and description required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeTitle = String(title).slice(0, 500);
    const safeDescription = String(description).slice(0, 5000);
    const safeSenderName = senderName ? String(senderName).slice(0, 200) : "مواطن";

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

    const systemPrompt = `أنت خبير متخصص في تحليل الشكاوى والمحتوى والامتثال الأخلاقي لمنصة تواصل بين المواطنين والنواب.

مهمتك الرئيسية:
1. فحص الشكوى للكشف عن أي محتوى مسيء أو غير لائق
2. إعادة صياغة الشكوى بشكل احترافي ورسمي ومختصر
3. تصنيف الشكوى حسب الأهمية والنوع والفئة

القواعد الصارمة للفحص:
- رفض فوري لأي شتائم أو سب أو قذف أو تهديدات
- رفض أي محتوى جنسي أو مسيء للكرامة
- رفض أي محتوى يسخر من الدولة أو النواب بنية سيئة
- السماح بالنقد البناء والشكاوى المشروعة

قواعد إعادة الصياغة:
- اجعل العنوان واضحاً وموجزاً (5-10 كلمات)
- اجعل الوصف منظماً في نقاط رئيسية
- استخدم لغة رسمية واحترافية
- احذف التفاصيل غير الضرورية والتكرار
- اترجم النصوص الإنجليزية إلى العربية إن وجدت

تصنيف الأهمية:
- "urgent": مشاكل تهدد السلامة أو الصحة (انقطاع ماء، حريق، إصابة)
- "humanitarian": مشاكل إنسانية (فقر، مرض، تشرد)
- "normal": مشاكل عادية (طرق، مرافق عامة، تعليم)

تصنيف النوع:
- "individual": مشكلة تخص فرداً واحداً
- "collective": مشكلة تخص مجموعة أو حي أو منطقة

أجب بصيغة JSON فقط:
{
  "status": "accepted" أو "rejected",
  "isOffensive": true أو false,
  "rejectionReason": "سبب الرفض إن وجد",
  "refined_title": "العنوان المُعاد صياغته",
  "refined_description": "الوصف المُعاد صياغته في نقاط",
  "category": "individual" أو "collective",
  "issueCategory": "مياه، طرق، صحة، تعليم، كهرباء، نظافة، مرافق عامة، أخرى",
  "priority": "urgent" أو "humanitarian" أو "normal",
  "summary": "ملخص في جملة واحدة واضحة"
}`;

    const userMessage = `اسم المرسل: ${safeSenderName}
العنوان: ${safeTitle}
الوصف: ${safeDescription}

تذكر: يجب أن تكون الإجابة بصيغة JSON صحيحة فقط بدون أي نص إضافي.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: `${systemPrompt}\n\n${userMessage}` }] }],
          generationConfig: { 
            responseMimeType: "application/json",
            temperature: 0.7,
            topP: 0.9,
            topK: 40,
          },
        }),
      }
    );

    if (!response.ok) throw new Error(`Gemini API error: ${response.status}`);

    const data = await response.json();
    let result;
    
    try {
      result = JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      result = { status: "error", message: "فشل تحليل الرد من الذكاء الاصطناعي" };
    }

    // --- Validate result structure ---
    if (!result.status) {
      result.status = "error";
      result.message = "رد غير صحيح من الذكاء الاصطناعي";
    }

    // --- Penalty Enforcement for Offensive Content ---
    if (result.isOffensive === true) {
      // Call the database function to log violation and apply penalty
      const { error: penaltyError } = await supabase.rpc('handle_user_violation', {
        _user_id: userId,
        _violation_type: 'offensive_language',
        _content_preview: safeTitle + ": " + safeDescription.slice(0, 100)
      });

      if (penaltyError) console.error("Penalty enforcement error:", penaltyError);

      // Get updated violation count to customize message
      const { count } = await supabase
        .from('user_violations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const violationCount = count || 1;
      let penaltyMessage = "تم رفض رسالتك لاحتوائها على محتوى مسيء. ";
      if (violationCount === 1) {
        penaltyMessage += "لقد تم إيقاف حسابك لمدة أسبوع كتحذير أول.";
      } else {
        penaltyMessage += "نظراً لتكرار الإساءة، تم حظر حسابك نهائياً من المنصة.";
      }

      return new Response(JSON.stringify({
        status: "rejected",
        rejectionReason: penaltyMessage,
        isOffensive: true,
        violationCount: violationCount
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Store refined content in database if accepted ---
    if (result.status === "accepted") {
      // Update the issue with refined fields (if issue_id is provided)
      // This will be done in the CitizenDashboard after issue creation
      result.refined_title = result.refined_title || safeTitle;
      result.refined_description = result.refined_description || safeDescription;
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("classify-issue error:", e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء معالجة الطلب.", status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
