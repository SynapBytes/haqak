const E164_REGEX = /^\+[1-9]\d{1,14}$/;

type RateBucket = Map<string, number[]>;

const ipBuckets: RateBucket = new Map();
const phoneBuckets: RateBucket = new Map();
let cleanupTicker = 0;

export function normalizeE164(input: string): string | null {
  const trimmed = input.trim();
  const compact = trimmed.replace(/[\s()-]/g, "");
  if (!compact.startsWith("+")) return null;
  return E164_REGEX.test(compact) ? compact : null;
}

function parseAllowedOrigins(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  );
}

export function corsHeaders(origin: string | undefined): Record<string, string> {
  const allowed = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  const allowOrigin = origin && allowed.has(origin) ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
    "Content-Type": "application/json; charset=utf-8",
  };
}

export function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) return false;
  const allowed = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  return allowed.has(origin);
}

function consumeFromBucket(bucket: RateBucket, key: string, limit: number, windowMs: number): boolean {
  if (limit <= 0) return false;
  const now = Date.now();
  const prev = bucket.get(key) ?? [];
  const next = prev.filter((ts) => now - ts < windowMs);

  if (next.length >= limit) {
    bucket.set(key, next);
    return false;
  }

  next.push(now);
  bucket.set(key, next);
  return true;
}

function canConsume(bucket: RateBucket, key: string, limit: number, windowMs: number): boolean {
  if (limit <= 0) return false;
  const now = Date.now();
  const prev = bucket.get(key) ?? [];
  const next = prev.filter((ts) => now - ts < windowMs);
  if (next.length === 0) {
    bucket.delete(key);
  } else if (next.length !== prev.length) {
    bucket.set(key, next);
  }
  return next.length < limit;
}

function cleanupBucket(bucket: RateBucket, windowMs: number): void {
  const now = Date.now();
  for (const [key, values] of bucket.entries()) {
    const fresh = values.filter((ts) => now - ts < windowMs);
    if (fresh.length === 0) {
      bucket.delete(key);
    } else if (fresh.length !== values.length) {
      bucket.set(key, fresh);
    }
  }
}

export function consumeRateLimit(params: {
  ip: string;
  phone: string;
  ipLimit: number;
  phoneLimit: number;
  windowMs: number;
}): boolean {
  cleanupTicker = (cleanupTicker + 1) % 100;
  if (cleanupTicker === 0) {
    cleanupBucket(ipBuckets, params.windowMs);
    cleanupBucket(phoneBuckets, params.windowMs);
  }

  const ipOk = canConsume(ipBuckets, params.ip, params.ipLimit, params.windowMs);
  const phoneOk = canConsume(phoneBuckets, params.phone, params.phoneLimit, params.windowMs);
  if (!ipOk || !phoneOk) return false;

  const consumeIp = consumeFromBucket(ipBuckets, params.ip, params.ipLimit, params.windowMs);
  const consumePhone = consumeFromBucket(phoneBuckets, params.phone, params.phoneLimit, params.windowMs);
  return consumeIp && consumePhone;
}

export function getClientIp(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers["x-forwarded-for"];
  if (Array.isArray(forwarded)) {
    return forwarded[0]?.split(",")[0]?.trim() || "unknown";
  }
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return "unknown";
}

export function sendJson(
  res: { status: (code: number) => { json: (body: unknown) => void } },
  code: number,
  body: unknown,
): void {
  res.status(code).json(body);
}
