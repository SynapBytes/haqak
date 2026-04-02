import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.2";
import { analyzeImageSafety } from "../shared/ai-service.ts";
import { buildCorsHeaders } from "../shared/cors.ts";

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

/**
 * Return true if the hostname is a private/loopback/link-local address.
 * Blocked: 127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, ::1, fc00::/7, fe80::/10.
 */
function isPrivateIp(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "localhost") return true;
  const bare = h.startsWith("[") && h.endsWith("]") ? h.slice(1, -1) : h;
  if (bare === "::1") return true;
  if (/^f[cd]/.test(bare)) return true;   // fc00::/7 unique-local
  if (/^fe[89ab]/.test(bare)) return true; // fe80::/10 link-local
  const parts = bare.split(".");
  if (parts.length === 4) {
    const octets = parts.map(Number);
    if (octets.some((o) => !Number.isInteger(o) || o < 0 || o > 255)) return false;
    const [a, b] = octets;
    if (a === 127) return true;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true;
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

  if (isPrivateIp(url.hostname)) {
    throw new Error("Invalid host");
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
  const cors = buildCorsHeaders(req.headers.get("Origin"), true);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // VULN-03 fix: validate the JWT via getUser() — a bare Bearer prefix check
    // is not sufficient; any string like "Bearer faketoken" would have passed.
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { title, description, imageUrls } = await req.json();

    if (!title || !description) {
      return new Response(JSON.stringify({ error: "title and description required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
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
        headers: { ...cors, "Content-Type": "application/json" },
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
      headers: { ...cors, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("filter-content error:", e);
    return new Response(JSON.stringify({ error: "حدث خطأ أثناء فحص المحتوى", status: "error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
