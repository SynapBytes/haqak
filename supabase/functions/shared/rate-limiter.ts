import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const RATE_LIMIT_WINDOW_MINUTES = 1;
const RATE_LIMIT_MAX = 100;

export const rateLimiter = async (supabase: any, userId: string, path: string) => {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000);

  // Count requests in the current window from the database
  const { count, error } = await supabase
    .from('rate_limit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('request_path', path)
    .gte('request_timestamp', windowStart.toISOString());

  if (error) {
    console.error('Rate limiter database error:', error);
    // Fallback to allow request if DB fails, or handle as needed
    return;
  }

  if (count !== null && count >= RATE_LIMIT_MAX) {
    throw new Error('Rate limit exceeded');
  }

  // Log the current request
  // Note: In a real Edge Function, you'd get the IP from the request headers
  await supabase.from('rate_limit_logs').insert({
    user_id: userId,
    request_path: path,
    response_status: 200, // Assuming success for now
    ip_address: '0.0.0.0' // Placeholder, should be passed from the caller
  });
};
