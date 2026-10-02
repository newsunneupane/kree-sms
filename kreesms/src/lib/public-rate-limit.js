// Shared-store fixed-window limiter for the public gateway.
// Uses Upstash Redis REST (HTTP — no TCP pooling issues on serverless).
// Falls back to the in-memory buckets in ./rate-limit.js when Upstash is
// unconfigured (single-instance safety only — add Upstash before going public).
// `bucket` is a fully-qualified suffix, e.g. "ip:1.2.3.4" or "key:<clientId>".
import { rateLimit as memoryRateLimit } from "./rate-limit.js";

let redis = null;
async function getRedis() {
  if (redis) return redis;
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  const { Redis } = await import("@upstash/redis");
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  return redis;
}

function memoryFallback(req, limit, windowSec) {
  const r = memoryRateLimit(req, {
    windowMs: windowSec * 1000,
    max: limit,
    message: "Too many requests. Please try again later.",
  });
  if (r.limited) {
    const retryAfter = r.response.headers.get("Retry-After") || String(windowSec);
    return { allowed: false, retryAfter: Number(retryAfter), response: r.response };
  }
  return { allowed: true, retryAfter: 0 };
}

export async function sharedRateLimit(req, bucket, limit, windowSec = 60) {
  try {
    const client = await getRedis();
    if (!client) return memoryFallback(req, limit, windowSec);
    const key = `kreesms:public:${bucket}`;
    const count = await client.incr(key);
    if (count === 1) await client.expire(key, windowSec);
    if (count > limit) {
      const ttl = await client.ttl(key);
      const retryAfter = ttl > 0 ? ttl : windowSec;
      return {
        allowed: false,
        retryAfter,
        response: Response.json(
          { success: false, message: "Too many requests. Please try again later." },
          { status: 429, headers: { "Retry-After": String(retryAfter) } }
        ),
      };
    }
    return { allowed: true, retryAfter: 0 };
  } catch {
    // Redis outage must not take down SMS sending — fail open, in-memory
    // per-instance buckets still absorb single-instance bursts.
    return memoryFallback(req, limit, windowSec);
  }
}

export function publicClientIp(req) {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}
