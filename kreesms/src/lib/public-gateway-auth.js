// Shared HMAC auth for the public third-party gateway.
// Used by POST /api/public/send-sms and POST /api/public/send-bulk.
// External products prove secret possession per request (HMAC) instead of
// logging in with a session cookie.
import { ensureDb } from "./db.js";
import { ApiClient } from "./models/index.js";
import { publicClientIp } from "./public-rate-limit.js";
import {
  decryptSecret,
  hashWithPepper,
  signPublicRequest,
  timingSafeHexEqual,
} from "./public-auth.js";

export const TIMESTAMP_SKEW_MS = 5 * 60 * 1000;

// Returns { client, auth } on success, or { error: { message, status, keyPrefix, apiClientId } }.
export async function authenticatePublicGateway(req, rawBody) {
  const apiKey = req.headers.get("x-api-key")?.trim();
  const timestamp = req.headers.get("x-timestamp")?.trim();
  const signature = req.headers.get("x-signature")?.trim().toLowerCase();
  if (!apiKey || !timestamp || !signature) {
    return {
      error: {
        message: "Missing x-api-key, x-timestamp, or x-signature.",
        status: 401,
        keyPrefix: apiKey?.slice(0, 20) ?? null,
      },
    };
  }
  const requestTime = Date.parse(timestamp);
  if (Number.isNaN(requestTime) || Math.abs(Date.now() - requestTime) > TIMESTAMP_SKEW_MS) {
    return {
      error: {
        message: "Stale request timestamp (max 5 min skew).",
        status: 401,
        keyPrefix: apiKey.slice(0, 20),
      },
    };
  }

  await ensureDb();
  const client = await ApiClient.findOne({ where: { key_hash: hashWithPepper(apiKey) } });
  if (!client || !client.is_active) {
    return {
      error: { message: "Invalid API key.", status: 401, keyPrefix: apiKey.slice(0, 20) },
    };
  }
  const clientIp = publicClientIp(req);
  const allowed = Array.isArray(client.allowed_ips) ? client.allowed_ips : [];
  if (allowed.length > 0 && clientIp !== "unknown" && !allowed.includes(clientIp)) {
    return {
      error: {
        message: "IP not allowlisted for this key.",
        status: 403,
        apiClientId: client.id,
        keyPrefix: client.key_prefix,
      },
    };
  }
  let secret;
  try {
    secret = decryptSecret(client.secret_enc);
  } catch {
    return {
      error: {
        message: "Server key misconfiguration.",
        status: 500,
        apiClientId: client.id,
        keyPrefix: client.key_prefix,
      },
    };
  }
  if (!timingSafeHexEqual(signPublicRequest(secret, timestamp, rawBody), signature)) {
    return {
      error: {
        message: "Invalid signature.",
        status: 401,
        apiClientId: client.id,
        keyPrefix: client.key_prefix,
      },
    };
  }
  return { client, auth: { apiClientId: client.id, keyPrefix: client.key_prefix } };
}
