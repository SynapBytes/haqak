import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { analyzeImageSafety } from "../shared/ai-service.ts";

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

/**
 * Allowed image host patterns loaded once from the environment.
 *
 * Configure via the ALLOWED_IMAGE_HOSTS edge-function secret (comma-separated).
 * Supported patterns:
 *   - Exact hostname:        "images.example.com"
 *   - Wildcard subdomain:    "*.example.com"  (matches the bare domain and any sub)
 *
 * Entries containing schemes, ports, paths, or whitespace are silently
 * discarded.  An empty list causes all image URLs to be rejected (fail-closed).
 *
 * NOTE: The validation helpers below mirror the logic in src/lib/ssrfGuard.ts.
 * They are intentionally inlined here because Supabase Edge Functions run on
 * Deno and cannot import from the Vite/Node src/ tree at runtime. Keep both
 * copies in sync when modifying the validation rules.
 */
const _rawAllowedHosts =
  (typeof Deno !== "undefined" ? Deno.env.get("ALLOWED_IMAGE_HOSTS") : undefined) ?? "";

const ALLOWED_IMAGE_HOST_PATTERNS: string[] = _rawAllowedHosts
  .split(",")
  .map((h) => h.trim())
  .filter((h) => h.length > 0)
  .filter((h) => {
    if (/[:/\s]/.test(h)) return false;
    if (h.startsWith("*.")) {
      const rest = h.slice(2);
      return rest.length > 0 && /^[A-Za-z0-9.-]+$/.test(rest);
    }
    return /^[A-Za-z0-9.-]+$/.test(h);
  });

function isHostAllowed(hostname: string): boolean {
  if (ALLOWED_IMAGE_HOST_PATTERNS.length === 0) return false;
  for (const pattern of ALLOWED_IMAGE_HOST_PATTERNS) {
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(1); // ".example.com"
      const bare = suffix.slice(1);    // "example.com"
      if (hostname === bare || hostname.endsWith(suffix)) return true;
    } else if (hostname === pattern) {
      return true;
    }
  }
  return false;
}

function buildValidatedUrl(baseUrl: string): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch (err) {
    throw new Error("Invalid URL", { cause: err });
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Invalid protocol");
  }

  if (!isHostAllowed(url.hostname)) {
    throw new Error("Invalid host");
  }

  // Guard against path traversal via percent-encoded ".." segments.
  let decodedPath: string;
  try {
    decodedPath = decodeURIComponent(url.pathname);
  } catch (err) {
    throw new Error("Invalid URL", { cause: err });
  }
  if (decodedPath.split("/").some((seg) => seg === "..")) {
    throw new Error("Invalid path");
  }

  return url.href;
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
    let imageAnalysisMeta;

    if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
      for (const imageUrl of imageUrls) {
        try {
          const validatedUrl = buildValidatedUrl(imageUrl);
          // redirect: "manual" prevents open-redirect-based SSRF: a 3xx
          // response from an allowed host cannot redirect to an internal target.
          const imageResponse = await fetch(validatedUrl, { redirect: "manual" });
          if (!imageResponse.ok) continue;

          const imageBuffer = await imageResponse.arrayBuffer();
          const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));
          const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

          const { flagged, meta } = await analyzeImageSafety(base64Image, mimeType);
          imageAnalysisMeta = meta;

          if (flagged) {
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

    return new Response(JSON.stringify({ ...result, ai_meta: imageAnalysisMeta }), {
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
