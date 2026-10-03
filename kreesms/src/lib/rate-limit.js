// In-memory fixed-window rate limiter for single-instance / local use.
// On Vercel (many ephemeral instances) use a shared store (e.g. Upstash Redis)
// for production abuse protection; this still guards per-instance bursts.

const buckets = new Map();

function hit(key, windowMs, max, cost = 1) {
  const now = Date.now();
  const entry = buckets.get(key);
  if (!entry || now - entry.start > windowMs) {
    buckets.set(key, { start: now, count: cost });
    if (cost > max) {
      return { allowed: false, retryAfter: Math.ceil(windowMs / 1000) };
    }
    return { allowed: true };
  }
  entry.count += cost;
  if (entry.count > max) {
    const retryAfter = Math.ceil((entry.start + windowMs - now) / 1000);
    return { allowed: false, retryAfter };
  }
  return { allowed: true };
}

if (typeof globalThis !== "undefined" && !globalThis.__kreesmsRateLimitSweep) {
  globalThis.__kreesmsRateLimitSweep = true;
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) {
      if (now - v.start > 30 * 60 * 1000) buckets.delete(k);
    }
  }, 5 * 60 * 1000).unref?.();
}

function clientKey(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

export function rateLimit(req, { windowMs, max, message, cost = 1 }) {
  const key = `${req.nextUrl?.pathname || req.url}:${clientKey(req)}`;
  const r = hit(key, windowMs, max, cost);
  if (!r.allowed) {
    return {
      limited: true,
      response: Response.json(
        { success: false, message: message || "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(r.retryAfter || 60) } }
      ),
    };
  }
  return { limited: false };
}

export const authLimiter = (req) =>
  rateLimit(req, { windowMs: 15 * 60 * 1000, max: 10, message: "Too many login/register attempts. Try again in 15 minutes." });

export const smsLimiter = (req) =>
  rateLimit(req, { windowMs: 60 * 1000, max: 20, message: "SMS send limit reached. Wait a moment." });
