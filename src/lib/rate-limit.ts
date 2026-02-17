/**
 * Client-side rate limiter using localStorage.
 *
 * Defense-in-depth: prevents legitimate users from accidentally burning
 * through Supabase backend rate limits and getting opaque 429s.
 * Limits here mirror Supabase project settings exactly.
 */

interface RateLimitConfig {
  key: string;
  maxRequests: number;
  windowMs: number;
}

interface RateLimitResult {
  allowed: boolean;
  retryAfterMs: number;
}

function getTimestamps(key: string): number[] {
  try {
    const raw = localStorage.getItem(`rl:${key}`);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

function setTimestamps(key: string, timestamps: number[]): void {
  try {
    localStorage.setItem(`rl:${key}`, JSON.stringify(timestamps));
  } catch {
    // localStorage full or unavailable — fail open
  }
}

export function checkRateLimit(config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Keep only timestamps within the current window
  const timestamps = getTimestamps(config.key).filter(t => t > windowStart);

  if (timestamps.length >= config.maxRequests) {
    const oldest = Math.min(...timestamps);
    const retryAfterMs = oldest + config.windowMs - now;
    return { allowed: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }

  // Record this attempt
  timestamps.push(now);
  setTimestamps(config.key, timestamps);
  return { allowed: true, retryAfterMs: 0 };
}

export function formatRetryAfter(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
}

/*
 * Pre-configured limits matching Supabase project settings.
 *
 * Sign-ups/sign-ins:   200 req / 5 min per IP
 * Email sending:        500 emails / hour (project-wide)
 * Token refresh:        200 req / 5 min per IP
 * Token verification:   200 req / 5 min per IP
 * Anonymous sign-in:     30 req / hour per IP
 * Web3 sign-in:          30 req / 5 min per IP
 * SMS sending:           30 sms / hour (project-wide)
 */
export const RATE_LIMITS = {
  signIn:        { key: 'auth:sign-in',        maxRequests: 200, windowMs: 5 * 60 * 1000 },
  email:         { key: 'auth:email',           maxRequests: 500, windowMs: 60 * 60 * 1000 },
  tokenRefresh:  { key: 'auth:token-refresh',   maxRequests: 200, windowMs: 5 * 60 * 1000 },
  tokenVerify:   { key: 'auth:token-verify',    maxRequests: 200, windowMs: 5 * 60 * 1000 },
  anonymous:     { key: 'auth:anonymous',       maxRequests: 30,  windowMs: 60 * 60 * 1000 },
  web3:          { key: 'auth:web3',            maxRequests: 30,  windowMs: 5 * 60 * 1000 },
  sms:           { key: 'auth:sms',             maxRequests: 30,  windowMs: 60 * 60 * 1000 },
} as const;
