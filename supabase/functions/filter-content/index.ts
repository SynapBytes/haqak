import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// List of offensive keywords and patterns (Arabic and English)
const offensivePatterns = [
  // Arabic offensive words (basic list - can be expanded)
  /\bشتيمة\b/gi,
  /\bسب\b/gi,
  /\bقذف\b/gi,
  /\bتهديد\b/gi,
  /\bجنسي\b/gi,
  /\bعنف\b/gi,
  // English offensive words
  /\b(fuck|shit|damn|hell|bitch|asshole|bastard|crap)\b/gi,
  /\b(sexual|porn|xxx|nude)\b/gi,
  /\b(violence|kill|murder|rape)\b/gi,
];

// Keywords that indicate collective issues
const collectiveKeywords = [
  "حي", "منطقة", "شارع", "طريق", "مدرسة", "مستشفى", "مركز", "حديقة",
  "جميع", "كل", "معظم", "الكثير", "نحن", "نحن جميعاً",
  "neighborhood", "area", "street", "road", "school", "hospital", "center", "park",
  "all", "most", "many", "we", "everyone"
];

interface FilterResult {
  isClean: boolean;
  isSuspicious: boolean;
  reason?: string;
  isCollective?: boolean;
  confidence?: number;
}

function detectOffensiveContent(text: string): boolean {
  for (const pattern of offensivePatterns) {
    if (pattern.test(text)) {
      return true;
    }
  }
  return false;
}

function detectCollectiveIssue(text: string): boolean {
  const lowerText = text.toLowerCase();
  return collectiveKeywords.some(keyword => lowerText.includes(keyword));
}

function buildValidatedUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    
    const allowedDomains = ['example.com']; // add your allowed domains here
    if (!allowedDomains.includes(url.hostname)) {
      throw new Error('Invalid host');
    }
    
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error('Invalid protocol');
    }
    
    return url.href;
  } catch {
    throw new Error('Invalid URL');
  }
}

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

    const { title, description, imageUrls } = await req.json();

    if (!title || !description) {
      return new Response(JSON.stringify({ error: "title and description required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result: FilterResult = {
      isClean: true,
      isSuspicious: false,
    };

    // --- Text filtering ---
    const combinedText = `${title} ${description}`;
    
    if (detectOffensiveContent(combinedText)) {
      result.isClean = false;
      result.reason = "محتوى مسيء أو غير لائق تم اكتشافه";
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Detect collective issue ---
    result.isCollective = detectCollectiveIssue(combinedText);

    // --- Image filtering (if images provided) ---
    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
      
      if (GEMINI_API_KEY) {
        for (const imageUrl of imageUrls) {
          try {
            // Use Gemini Vision API to analyze image
            const validatedUrl = buildValidatedUrl(imageUrl);
            const imageResponse = await fetch(validatedUrl);
            if (!imageResponse.ok) continue;

            const imageBuffer = await imageResponse.arrayBuffer();
            const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

            const visionResponse = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{
                    role: "user",
                    parts: [
                      { text: "هل تحتوي هذه الصورة على محتوى جنسي أو عنيف أو مسيء؟ أجب بـ 'نعم' أو 'لا' فقط." },
                      {
                        inlineData: {
                          mimeType: "image/jpeg",
                          data: base64Image,
                        },
                      },
                    ],
                  }],
                }),
              }
            );

            const visionData = await visionResponse.json();
            const visionText = visionData.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (visionText.includes("نعم") || visionText.includes("yes") || visionText.includes("Yes")) {
              result.isClean = false;
              result.reason = "الصورة المرفقة تحتوي على محتوى مسيء أو غير لائق";
              break;
            }
          } catch (imageError) {
            console.error("Image analysis error:", imageError);
            // Continue with other images if one fails
          }
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("filter-content error:", e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء فحص المحتوى", status: "error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
