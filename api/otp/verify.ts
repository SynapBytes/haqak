import {
  corsHeaders,
  isOriginAllowed,
  sendJson,
} from "./_shared.js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

function normalizeHeaderValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function applyCors(req: VercelRequest, res: VercelResponse): string | undefined {
  const origin = normalizeHeaderValue(req.headers.origin);
  const headers = corsHeaders(origin);
  Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  return origin;
}

function requireEnv(name: string): string | null {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : null;
}

async function parseJsonSafe(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch (error) {
    console.error("Failed to parse verify-otp upstream response JSON:", error);
    return {};
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  const origin = applyCors(req, res);

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" });
    return;
  }

  if (!isOriginAllowed(origin)) {
    sendJson(res, 403, { error: "Origin not allowed" });
    return;
  }

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey) {
    sendJson(res, 500, { error: "Server misconfiguration" });
    return;
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
      },
      body: JSON.stringify(req.body ?? {}),
    });

    const data = await parseJsonSafe(response);
    if (!response.ok) {
      const error = typeof data.error === "string" ? data.error : "Failed to verify OTP";
      sendJson(res, response.status, { error });
      return;
    }

    sendJson(res, 200, data);
  } catch (error) {
    console.error("OTP verify failed:", error);
    sendJson(res, 500, { error: "Failed to verify OTP" });
  }
}
