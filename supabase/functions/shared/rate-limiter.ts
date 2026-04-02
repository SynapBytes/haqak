import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

// Default limits — callers may override via the options parameter
const DEFAULT_RATE_LIMIT_WINDOW_MINUTES = 1;
const DEFAULT_RATE_LIMIT_MAX = 100;

// Tighter limits for sensitive OTP / auth paths
const SENSITIVE_PATHS = ["/send-otp", "/auth", "/verify-otp", "/verify-captcha"];
const SENSITIVE_RATE_LIMIT_MAX = 10;
const SENSITIVE_WINDOW_MINUTES = 1;

export interface RateLimiterOptions {
  windowMinutes?: number;
  maxRequests?: number;
}

export class RateLimitError extends Error {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/**
 * DB-backed rate limiter for Supabase Edge Functions.
 *
 * Keys requests by (userId, path) AND (ipAddress, path) to handle both
 * authenticated and anonymous scenarios.  Sensitive paths (OTP, auth) use
 * tighter limits automatically unless overridden via `options`.
 *
 * Throws `RateLimitError` when the limit is exceeded, so callers can return
 * a 429 response with a `Retry-After` header.
 */
export const rateLimiter = async (
  supabase: ReturnType<typeof createClient>,
  userId: string,
  path: string,
  ipAddress = "0.0.0.0",
  responseStatus = 200,
  options: RateLimiterOptions = {},
) => {
  const isSensitive = SENSITIVE_PATHS.some((p) => path.startsWith(p));

  const windowMinutes = options.windowMinutes
    ?? (isSensitive ? SENSITIVE_WINDOW_MINUTES : DEFAULT_RATE_LIMIT_WINDOW_MINUTES);
  const maxRequests = options.maxRequests
    ?? (isSensitive ? SENSITIVE_RATE_LIMIT_MAX : DEFAULT_RATE_LIMIT_MAX);

  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  const safeIp = ipAddress || "0.0.0.0";

  // Count requests by userId + path within the window
  const { count: userCount, error: userError } = await supabase
    .from('rate_limit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('request_path', path)
    .gte('request_timestamp', windowStart);

  if (userError) {
    // Fail open on DB errors to avoid blocking legitimate traffic
    console.error('Rate limiter DB error (user):', userError.code);
  } else if (userCount !== null && userCount >= maxRequests) {
    throw new RateLimitError(windowMinutes * 60);
  }

  // Count requests by IP + path within the window (defends against multi-account abuse)
  const { count: ipCount, error: ipError } = await supabase
    .from('rate_limit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', safeIp)
    .eq('request_path', path)
    .gte('request_timestamp', windowStart);

  if (ipError) {
    console.error('Rate limiter DB error (ip):', ipError.code);
  } else if (ipCount !== null && ipCount >= maxRequests) {
    throw new RateLimitError(windowMinutes * 60);
  }

  // Log the current request
  await supabase.from('rate_limit_logs').insert({
    user_id: userId,
    request_path: path,
    response_status: responseStatus,
    ip_address: safeIp,
  });
};
