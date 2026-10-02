// API key + HMAC auth for the public third-party gateway
// (POST /api/public/send-sms). Separate from the session-cookie flow in
// ./auth.js: external products (school/restaurant/accounting software) are
// unattended callers that prove secret possession per request instead of
// logging in. Secrets are shown once at issuance and never persisted — the
// DB holds a peppered SHA-256 key hash plus an AES-256-GCM secret envelope.
import crypto from "crypto";

const pepper = () => process.env.SMS_HMAC_PEPPER || "";

function requirePepper() {
  if (!pepper()) throw new Error("SMS_HMAC_PEPPER is not set.");
}

const encKey = () => crypto.createHash("sha256").update(`enc:${pepper()}`).digest();

export function generateApiKey() {
  return `kree_pk_live_${crypto.randomBytes(18).toString("base64url")}`;
}

export function keyPrefixOf(apiKey) {
  return String(apiKey).slice(0, 20);
}

export function generateApiSecret() {
  return crypto.randomBytes(36).toString("hex");
}

export function hashWithPepper(value) {
  requirePepper();
  return crypto.createHash("sha256").update(String(value) + pepper()).digest("hex");
}

export function hashIp(ip) {
  return hashWithPepper(`ip:${ip}`);
}

export function hashPhone(normalizedTo) {
  return hashWithPepper(`to:${normalizedTo}`);
}

export function maskPhone(normalizedTo) {
  const digits = String(normalizedTo).replace(/\D/g, "");
  if (digits.length < 6) return "******";
  return `${digits.slice(0, 2)}XXXXXX${digits.slice(-2)}`;
}

export function encryptSecret(secret) {
  requirePepper();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encKey(), iv);
  const enc = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${enc.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
}

export function decryptSecret(envelope) {
  requirePepper();
  const [ivB64, encB64, tagB64] = String(envelope).split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encKey(), Buffer.from(ivB64, "base64url"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encB64, "base64url")), decipher.final()]).toString("utf8");
}

// Canonical signature clients compute:
//   HMAC_SHA256(secret, timestamp + "." + rawBody)
export function signPublicRequest(secret, timestamp, rawBody) {
  return crypto.createHmac("sha256", secret).update(`${timestamp}.${rawBody}`).digest("hex");
}

export function timingSafeHexEqual(aHex, bHex) {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(/^[0-9a-f]{64}$/i.test(bHex || "") ? bHex : "", "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
