import { ensureDb } from "@/lib/db";
import { ApiClient, User, sequelize } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate } from "@/lib/validators";
import { z } from "zod";
import crypto from "crypto";
import {
  generateApiKey,
  generateApiSecret,
  hashWithPepper,
  encryptSecret,
  keyPrefixOf,
} from "@/lib/public-auth";

export const runtime = "nodejs";

const issueSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  product: z.enum(["school", "restaurant", "accounting", "other"]).optional().default("school"),
  credits: z.coerce.number().int().min(0).max(10000000).optional().default(0),
  rateLimitPerMin: z.coerce.number().int().min(1).max(1000).optional().default(60),
  allowedIps: z.array(z.string().trim().max(45)).max(50).optional().default([]),
});

const CLIENT_ATTRS = [
  "id",
  "name",
  "product",
  "key_prefix",
  "rate_limit_per_min",
  "sms_balance",
  "is_active",
  "created_at",
];

export async function GET(req) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;
    await ensureDb();
    const clients = await ApiClient.findAll({ attributes: CLIENT_ATTRS, order: [["created_at", "DESC"]] });
    return ok({ clients });
  } catch (err) {
    return toErrorResponse(err);
  }
}

export async function POST(req) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;
    if (!process.env.SMS_HMAC_PEPPER) {
      return fail("SMS_HMAC_PEPPER is not set. Add it to .env.local first.", 500);
    }
    const body = await readJson(req);
    const v = validate(issueSchema, body);
    if (v.error) return v.error;

    await ensureDb();
    const apiKey = generateApiKey();
    const secret = generateApiSecret();
    // Panel login for the holder: generated non-routable email + one-time
    // password (bcrypt-hashed by the User hook). Pre-approved — no OTP flow.
    const slug = v.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12) || "client";
    const panelEmail = `${slug}-${crypto.randomBytes(3).toString("hex")}@api.kreesms.local`;
    const panelPassword = crypto.randomBytes(12).toString("base64url");
    const created = await sequelize.transaction(async (t) => {
      const holder = await User.create(
        { name: `${v.data.name} (API)`, email: panelEmail, password: panelPassword, role: "api_client" },
        { transaction: t }
      );
      const client = await ApiClient.create(
        {
          name: v.data.name,
          product: v.data.product,
          key_prefix: keyPrefixOf(apiKey),
          key_hash: hashWithPepper(apiKey),
          secret_enc: encryptSecret(secret),
          sms_balance: v.data.credits,
          rate_limit_per_min: v.data.rateLimitPerMin,
          allowed_ips: v.data.allowedIps,
          user_id: holder.id,
        },
        { transaction: t }
      );
      return { holder, client };
    });
    const client = created.client;
    // All three secrets are returned exactly once — none are recoverable later.
    return ok({
      message: `API key issued for ${client.name}. Copy all three secrets now — they will never be shown again.`,
      client: { id: client.id, name: client.name, product: client.product, key_prefix: client.key_prefix },
      apiKey,
      secret,
      panelEmail,
      panelPassword,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
