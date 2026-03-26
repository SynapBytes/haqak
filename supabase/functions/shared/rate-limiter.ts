// Simple in-memory rate limiter for edge functions
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute in ms
const RATE_LIMIT_MAX = 100;

export const rateLimiter = async (key: string) => {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (entry && now < entry.resetAt) {
    if (entry.count >= RATE_LIMIT_MAX) {
      throw new Error('Rate limit exceeded');
    }
    entry.count++;
  } else {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
  }
};
