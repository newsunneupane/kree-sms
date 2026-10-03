import { Op } from "sequelize";
import { ApiClient, PublicSmsLog, sequelize } from "@/lib/models/index.js";
import { sendSms, actualSmsCredit, isSmsRejected } from "@/lib/aakash";
import { calculateCreditCost } from "@/lib/credits";
import { ok, fail, toErrorResponse } from "@/lib/api";
import { validate, publicSendBulkSchema } from "@/lib/validators";
import { sharedRateLimit, publicClientIp } from "@/lib/public-rate-limit";
import { authenticatePublicGateway } from "@/lib/public-gateway-auth";
import { hashIp, hashPhone, maskPhone } from "@/lib/public-auth";

export const runtime = "nodejs";

const MAX_BODY_BYTES = 20 * 1024;
// Same per-message 8s budget as the single route; bulk fans out with
// concurrency 5 plus a global cap so a 100-recipient batch stays usable.
const PROVIDER_TIMEOUT_MS = 8000;
const BULK_CONCURRENCY = 5;
const BULK_GLOBAL_BUDGET_MS = 25000;

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

// Simple concurrency limiter (no extra dependency).
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (next < items.length) {
      const i = next;
      next += 1;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}

export async function POST(req) {
  const startedAt = Date.now();
  const clientIp = publicClientIp(req);
  const sourceUrl = truncate(req.headers.get("origin") || req.headers.get("referer"), 500);
  const batchId = req.headers.get("x-request-id")?.trim() || null;

  const logFailure = (statusCode, message, extra = {}) =>
    PublicSmsLog.create({
      api_client_id: extra.apiClientId ?? null,
      key_prefix: extra.keyPrefix ?? null,
      source_url: sourceUrl,
      client_ip_hash: clientIp !== "unknown" ? hashIp(clientIp) : null,
      client_ip: clientIp === "unknown" ? null : clientIp,
      method: "POST",
      path: "/api/public/send-bulk",
      status_code: statusCode,
      segments: 0,
      credits_used: 0,
      latency_ms: Date.now() - startedAt,
      error_message: truncate(message, 1000),
      idempotency_key: batchId,
    }).catch(() => undefined);

  try {
    // 1. Raw body (20kb cap) — HMAC covers these exact bytes.
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

    // 3. HMAC auth (shared helper — same as send-sms).
    const authResult = await authenticatePublicGateway(req, rawBody);
    if (authResult.error) {
      const e = authResult.error;
      await logFailure(e.status, e.message, {
        apiClientId: e.apiClientId ?? null,
        keyPrefix: e.keyPrefix ?? null,
      });
      return fail(e.message, e.status);
    }
    const { client, auth } = authResult;

    // 4. DTO validation (fail fast, before spending credits).
    let body;
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      await logFailure(400, "Invalid JSON.", auth);
      return fail("Invalid JSON.", 400);
    }
    const v = validate(publicSendBulkSchema, body);
    if (v.error) {
      await logFailure(400, "Validation error.", auth);
      return v.error;
    }

    const recipients = v.data.to.map(normalizeNepalMobile);
    const estimateEach = calculateCreditCost(v.data.message);
    const total = estimateEach * recipients.length;

    // 5. Per-key rate limit counts the whole batch (post-auth).
    const keyCheck = await sharedRateLimit(req, `key:${client.id}`, client.rate_limit_per_min, 60, recipients.length);
    if (!keyCheck.allowed) {
      await logFailure(429, "API key rate limit exceeded.", auth);
      return keyCheck.response;
    }

    // 6. Idempotency: same batch x-request-id replays the stored outcome.
    if (batchId) {
      const existing = await PublicSmsLog.findAll({
        where: {
          api_client_id: client.id,
          idempotency_key: { [Op.like]: `${batchId}#%` },
        },
      });
      if (existing.length === recipients.length && existing.every((r) => r.status_code === 200)) {
        const balance = (await ApiClient.findByPk(client.id))?.sms_balance ?? null;
        const creditsUsed = existing.reduce((s, r) => s + (r.credits_used || 0), 0);
        return ok({
          total: recipients.length,
          segmentsPerMessage: estimateEach,
          creditsUsed,
          balanceRemaining: balance,
          deduped: true,
        });
      }
    }

    // 7. Atomic prepaid reservation for the whole batch (all-or-nothing).
    let balanceRemaining;
    try {
      balanceRemaining = await sequelize.transaction(async (t) => {
        const fresh = await ApiClient.findByPk(client.id, { transaction: t, lock: t.LOCK.UPDATE });
        if (!fresh || !fresh.is_active) {
          const err = new Error("Invalid API key.");
          err.statusCode = 401;
          throw err;
        }
        if (fresh.sms_balance < total) {
          const err = new Error(`Insufficient SMS credits. Requires ~${total}, balance ${fresh.sms_balance}.`);
          err.statusCode = 402;
          throw err;
        }
        fresh.sms_balance -= total;
        await fresh.save({ transaction: t });
        return fresh.sms_balance;
      });
    } catch (error) {
      const status = error.statusCode || 402;
      await logFailure(status, error.message, auth);
      return fail(error.message, status);
    }

    // 8. Fan out with bounded concurrency. All-or-nothing means: validation +
    // balance were all-or-nothing with zero sends; provider sends are
    // best-effort (SMS can't be unsent) — failures are refunded exactly.
    const deadline = startedAt + BULK_GLOBAL_BUDGET_MS;
    const outcomes = await mapLimit(recipients, BULK_CONCURRENCY, async (to) => {
      if (Date.now() > deadline) return { to, result: { success: false, error: "Bulk time budget exceeded." } };
      const result = await sendWithBudget(to, v.data.message);
      return { to, result };
    });

    let chargedTotal = 0;
    let failed = 0;
    const rows = [];
    for (const { to, result } of outcomes) {
      const rejected = !result.success || isSmsRejected(result, to);
      if (!rejected) {
        const charged = actualSmsCredit(result, to, estimateEach);
        chargedTotal += charged;
        rows.push({
          api_client_id: client.id,
          key_prefix: client.key_prefix,
          source_url: sourceUrl,
          client_ip_hash: clientIp !== "unknown" ? hashIp(clientIp) : null,
          client_ip: clientIp === "unknown" ? null : clientIp,
          method: "POST",
          path: "/api/public/send-bulk",
          status_code: 200,
          to_masked: maskPhone(to),
          to_hash: hashPhone(to),
          segments: estimateEach,
          credits_used: charged,
          provider: "aakash",
          provider_message_id: null,
          latency_ms: Date.now() - startedAt,
          idempotency_key: batchId ? `${batchId}#${to}` : null,
        });
      } else {
        failed += 1;
      }
    }

    // Refund the difference between reservation and actual charges (failures cost 0).
    const refund = Math.max(0, total - chargedTotal);
    let finalBalance = balanceRemaining;
    if (refund !== 0) {
      const updated = await ApiClient.findByPk(client.id);
      if (updated) {
        updated.sms_balance += refund;
        await updated.save();
        finalBalance = updated.sms_balance;
      }
    }
    if (rows.length > 0) await PublicSmsLog.bulkCreate(rows);

    if (failed > 0) {
      await logFailure(
        502,
        `Bulk partially failed: ${rows.length} sent, ${failed} failed, failed credits refunded.`,
        auth
      );
      return fail(
        `Bulk failed for ${failed} of ${recipients.length} recipients, failed credits refunded.`,
        502,
        { total: recipients.length, sent: rows.length, failed, creditsUsed: chargedTotal, balanceRemaining: finalBalance }
      );
    }

    return ok({
      total: recipients.length,
      segmentsPerMessage: estimateEach,
      creditsUsed: chargedTotal,
      balanceRemaining: finalBalance,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
