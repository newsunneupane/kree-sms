// Issue a public-gateway ApiClient credential pair.
// Run with: node scripts/issue-public-client.mjs "School MIS" school 100
// (loads .env.local for local runs — needs DB_* + SMS_HMAC_PEPPER)
// Prints the apiKey + secret ONCE. The secret is unrecoverable afterwards.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const { ApiClient } = await import("../src/lib/models/index.js");
const {
  generateApiKey,
  generateApiSecret,
  hashWithPepper,
  encryptSecret,
  keyPrefixOf,
} = await import("../src/lib/public-auth.js");

const main = async () => {
  const missing = ["DB_NAME", "DB_USER", "DB_PASS", "SMS_HMAC_PEPPER"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    console.error(`[issue-public-client] Missing in .env.local: ${missing.join(", ")}.`);
    process.exit(1);
  }
  const name = process.argv[2] || "Test Client";
  const product = process.argv[3] || "school";
  const credits = Number(process.argv[4] || 100);
  const apiKey = generateApiKey();
  const secret = generateApiSecret();
  const { sequelize } = await import("../src/lib/models/index.js");
  await sequelize.authenticate();
  const client = await ApiClient.create({
    name,
    product,
    key_prefix: keyPrefixOf(apiKey),
    key_hash: hashWithPepper(apiKey),
    secret_enc: encryptSecret(secret),
    sms_balance: credits,
  });
  console.log(JSON.stringify({ id: client.id, apiKey, secret, keyPrefix: client.key_prefix }, null, 2));
  console.log("Store the secret now — it cannot be recovered later.");
  await sequelize.close();
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
