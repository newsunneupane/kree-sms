import { ensureDb } from "@/lib/db";
import { ApiClient, PublicSmsLog, sequelize } from "@/lib/models/index.js";
import { sendSms, actualSmsCredit, isSmsRejected } from "@/lib/aakash";
import { calculateCreditCost } from "@/lib/credits";
import { ok, fail, toErrorResponse } from "@/lib/api";
import { validate, publicSendSmsSchema } from "@/lib/validators";
import { sharedRateLimit, publicClientIp } from "@/lib/public-rate-limit";
import {
  decryptSecret,
  hashIp,
  hashPhone,
  hashWithPepper,
  maskPhone,
  signPublicRequest,
  timingSafeHexEqual,
} from "@/lib/public-auth";

export const runtime = "nodejs";

const TIMESTAMP_SKEW_MS = 5 * 60 * 1000;
const MAX_BODY_BYTES = 10 * 1024;
// Vercel Hobby caps functions at ~10s; Aakash's own client waits 15s, so the
// public route enforces a tighter 8s budget and treats overruns as failures
// (credits refunded, 502 logged).
const PROVIDER_TIMEOUT_MS = 8000;

function truncate(value, max) {
  if (value == null) return null;
  const s = String(value);
  return s.length > max ? s.slice(0, max) : s;
}

function normalizeNepalMobile(to) {
  const digits = String(to).replace(/\D/g, "");
  const local = digits.startsWith("977") ? digits.slice(3) : digits;
  return `+977${local}`;
}

async function sendWithBudget(to, text) {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => resolve({ success: false, error: "SMS provider timed out." }), PROVIDER_TIMEOUT_MS);
  });
  try {
    return await Promise.race([sendSms(to, text), timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req) {
  const startedAt = Date.now();
  const clientIp = publicClientIp(req);
  const sourceUrl = truncate(req.headers.get("origin") || req.headers.get("referer"), 500);
  const idempotencyKey = req.headers.get("x-request-id")?.trim() || null;

  const logFailure = (statusCode, message, extra = {}) =>
    PublicSmsLog.create({
      api_client_id: extra.apiClientId ?? null,
      key_prefix: extra.keyPrefix ?? null,
      source_url: sourceUrl,
      client_ip_hash: clientIp !== "unknown" ? hashIp(clientIp) : null,
      client_ip: clientIp === "unknown" ? null : clientIp,
      method: "POST",
      path: "/api/public/send-sms",
      status_code: statusCode,
      segments: 0,
      credits_used: 0,
      latency_ms: Date.now() - startedAt,
      error_message: truncate(message, 1000),
      idempotency_key: idempotencyKey,
    }).catch(() => undefined);

  try {
    // 1. Raw body (10kb cap) — HMAC covers these exact bytes.
    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY_BYTES) {
      await logFailure(413, "Payload too large.");
      return fail("Payload too large.", 413);
    }

    // 2. Per-IP abuse floor (pre-auth — key unknown yet).
    const ipCheck = await sharedRateLimit(req, `ip:${clientIp}`, 100);
    if (!ipCheck.allowed) {
      await logFailure(429, "Too many requests from this IP.");
      return ipCheck.response;
    }

    // 3. HMAC auth.
    const apiKey = req.headers.get("x-api-key")?.trim();
    const timestamp = req.headers.get("x-timestamp")?.trim();
    const signature = req.headers.get("x-signature")?.trim().toLowerCase();
    if (!apiKey || !timestamp || !signature) {
      await logFailure(401, "Missing x-api-key, x-timestamp, or x-signature.", {
        keyPrefix: apiKey?.slice(0, 20) ?? null,
      });
      return fail("Missing x-api-key, x-timestamp, or x-signature.", 401);
    }
    const requestTime = Date.parse(timestamp);
    if (Number.isNaN(requestTime) || Math.abs(Date.now() - requestTime) > TIMESTAMP_SKEW_MS) {
      await logFailure(401, "Stale request timestamp.", { keyPrefix: apiKey.slice(0, 20) });
      return fail("Stale request timestamp (max 5 min skew).", 401);
    }

    await ensureDb();
    const client = await ApiClient.findOne({ where: { key_hash: hashWithPepper(apiKey) } });
    if (!client || !client.is_active) {
      await logFailure(401, "Invalid API key.", { keyPrefix: apiKey.slice(0, 20) });
      return fail("Invalid API key.", 401);
    }
    if (client.allowed_ips.length > 0 && clientIp !== "unknown" && !client.allowed_ips.includes(clientIp)) {
      await logFailure(403, "IP not allowlisted.", { apiClientId: client.id, keyPrefix: client.key_prefix });
      return fail("IP not allowlisted for this key.", 403);
    }
    let secret;
    try {
      secret = decryptSecret(client.secret_enc);
    } catch {
      return fail("Server key misconfiguration.", 500);
    }
    if (!timingSafeHexEqual(signPublicRequest(secret, timestamp, rawBody), signature)) {
      await logFailure(401, "Invalid signature.", { apiClientId: client.id, keyPrefix: client.key_prefix });
      return fail("Invalid signature.", 401);
    }
    const auth = { apiClientId: client.id, keyPrefix: client.key_prefix };

    // 4. Per-key rate limit (post-auth).
    const keyCheck = await sharedRateLimit(req, `key:${client.id}`, client.rate_limit_per_min);
    if (!keyCheck.allowed) {
      await logFailure(429, "API key rate limit exceeded.", auth);
      return keyCheck.response;
    }

    // 5. DTO validation (fail fast, before spending credits).
    let body;
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      await logFailure(400, "Invalid JSON.", auth);
      return fail("Invalid JSON.", 400);
    }
    const v = validate(publicSendSmsSchema, body);
    if (v.error) {
      await logFailure(400, "Validation error.", auth);
      return v.error;
    }

    const normalizedTo = normalizeNepalMobile(v.data.to);
    const toMasked = maskPhone(normalizedTo);
    const toHash = hashPhone(normalizedTo);
    const estimate = calculateCreditCost(v.data.message);

    // 6. Idempotency: same x-request-id replays the stored outcome, no double charge.
    if (idempotencyKey) {
      const existing = await PublicSmsLog.findOne({
        where: { api_client_id: client.id, idempotency_key: idempotencyKey },
      });
      if (existing && existing.status_code === 200) {
        const balance = (await ApiClient.findByPk(client.id))?.sms_balance ?? null;
        return ok({
          segments: existing.segments,
          creditsUsed: existing.credits_used,
          balanceRemaining: balance,
          deduped: true,
        });
      }
    }

    // 7. Atomic prepaid reservation (Aakash-exact charging happens after send).
    let balanceRemaining;
    try {
      balanceRemaining = await sequelize.transaction(async (t) => {
        const fresh = await ApiClient.findByPk(client.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!fresh || !fresh.is_active) {
          const err = new Error("Invalid API key.");
          err.statusCode = 401;
          throw err;
        }
        if (fresh.sms_balance < estimate) {
          const err = new Error(`Insufficient SMS credits. Requires ~${estimate}, balance ${fresh.sms_balance}.`);
          err.statusCode = 402;
          throw err;
        }
        fresh.sms_balance -= estimate;
        await fresh.save({ transaction: t });
        return fresh.sms_balance;
      });
    } catch (error) {
      const status = error.statusCode || 402;
      await logFailure(status, error.message, auth);
      return fail(error.message, status);
    }

    // 8. Sync provider send — deduct what Aakash actually charged, refund on failure.
    const result = await sendWithBudget(normalizedTo, v.data.message);
    const latencyMs = Date.now() - startedAt;
    if (result.success && !isSmsRejected(result, normalizedTo)) {
      const charged = actualSmsCredit(result, normalizedTo, estimate);
      const refund = Math.max(0, estimate - charged);
      let finalBalance = balanceRemaining;
      if (refund > 0 || charged !== estimate) {
        const updated = await ApiClient.findByPk(client.id);
        if (updated) {
          updated.sms_balance += estimate - charged;
          await updated.save();
          finalBalance = updated.sms_balance;
        }
      }
      await PublicSmsLog.create({
        ...{
          api_client_id: client.id,
          key_prefix: client.key_prefix,
          source_url: sourceUrl,
          client_ip_hash: clientIp !== "unknown" ? hashIp(clientIp) : null,
          client_ip: clientIp === "unknown" ? null : clientIp,
        },
        method: "POST",
        path: "/api/public/send-sms",
        status_code: 200,
        to_masked: toMasked,
        to_hash: toHash,
        segments: estimate,
        credits_used: charged,
        provider: "aakash",
        // Aakash v3 send responses carry no per-message id — the charged
        // credits + masked recipient in this row are the audit trail.
        provider_message_id: null,
        latency_ms: latencyMs,
        idempotency_key: idempotencyKey,
      });
      return ok({
        segments: estimate,
        creditsUsed: charged,
        balanceRemaining: finalBalance,
      });
    }

    // Provider failure or rejection: refund the full reservation.
    const failed = await ApiClient.findByPk(client.id);
    if (failed) {
      failed.sms_balance += estimate;
      await failed.save();
    }
    await logFailure(502, result.error || "SMS provider rejected the message.", auth);
    return fail("SMS provider failed, credits refunded.", 502);
  } catch (err) {
    return toErrorResponse(err);
  }
}
