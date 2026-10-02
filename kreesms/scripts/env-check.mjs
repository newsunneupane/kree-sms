// Fails the build/dev start if required server-only env is missing or leaked to client.
const required = ["DB_NAME", "DB_USER", "DB_PASS", "JWT_SECRET", "AAKASH_SMS_TOKEN", "AAKASH_API_URL", "AAKASH_CREDIT_URL"];
// SMS_HMAC_PEPPER is required only when the public gateway is used — warn
// instead of failing so existing dashboard-only deploys keep working.
const warnOnly = ["SMS_HMAC_PEPPER"];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`[env-check] Missing required env vars: ${missing.join(", ")}. Copy .env.example to .env.local first.`);
  process.exit(1);
}
if ((process.env.JWT_SECRET || "").length < 32) {
  console.error("[env-check] JWT_SECRET must be at least 32 characters.");
  process.exit(1);
}
const warnMissing = warnOnly.filter((k) => !process.env[k]);
if (warnMissing.length) {
  console.warn(`[env-check] WARNING: public gateway disabled — missing: ${warnMissing.join(", ")}.`);
}
if (Object.keys(process.env).some((k) => k.startsWith("NEXT_PUBLIC_") && /AAKASH|JWT|SMTP|DB_|SECRET/i.test(k))) {
  console.error("[env-check] Secret leaked via NEXT_PUBLIC_ prefix. Remove it.");
  process.exit(1);
}
console.log("[env-check] OK");
