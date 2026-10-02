// Issue a public-gateway ApiClient credential pair + holder panel login.
// Run with: node scripts/issue-public-client.mjs "School MIS" school 100
// (loads .env.local for local runs — needs DB_* + SMS_HMAC_PEPPER)
// Prints apiKey + secret + panel credentials ONCE. None are recoverable afterwards.
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import crypto from "crypto";
const { ApiClient, User } = await import("../src/lib/models/index.js");
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
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "client";
  const panelEmail = `${slug}-${crypto.randomBytes(3).toString("hex")}@api.kreesms.local`;
  const panelPassword = crypto.randomBytes(12).toString("base64url");
  const { sequelize } = await import("../src/lib/models/index.js");
  await sequelize.authenticate();
  const created = await sequelize.transaction(async (t) => {
    const holder = await User.create(
      { name: `${name} (API)`, email: panelEmail, password: panelPassword, role: "api_client" },
      { transaction: t }
    );
    const client = await ApiClient.create(
      {
        name,
        product,
        key_prefix: keyPrefixOf(apiKey),
        key_hash: hashWithPepper(apiKey),
        secret_enc: encryptSecret(secret),
        sms_balance: credits,
        user_id: holder.id,
      },
      { transaction: t }
    );
    return { holder, client };
  });
  console.log(
    JSON.stringify(
      { id: created.client.id, apiKey, secret, panelEmail, panelPassword, keyPrefix: created.client.key_prefix },
      null,
      2
    )
  );
  console.log("Store all three secrets now — none can be recovered later.");
  await sequelize.close();
  process.exit(0);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
