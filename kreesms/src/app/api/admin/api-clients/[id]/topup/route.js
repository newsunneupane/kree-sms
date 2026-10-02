import { ensureDb } from "@/lib/db";
import { ApiClient } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate } from "@/lib/validators";
import { z } from "zod";

export const runtime = "nodejs";

const topupSchema = z.object({
  credits: z.coerce.number().int().min(1, "Credits must be at least 1.").max(10000000),
});

export async function POST(req, { params }) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;
    const body = await readJson(req);
    const v = validate(topupSchema, body);
    if (v.error) return v.error;

    await ensureDb();
    const { id } = await params;
    const client = await ApiClient.findByPk(id);
    if (!client) return fail("API client not found.", 404);
    client.sms_balance += v.data.credits;
    await client.save();
    return ok({ message: `Added ${v.data.credits} credits to ${client.name}.`, sms_balance: client.sms_balance });
  } catch (err) {
    return toErrorResponse(err);
  }
}
