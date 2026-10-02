import { ensureDb } from "@/lib/db";
import { ApiClient } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate } from "@/lib/validators";
import { z } from "zod";

export const runtime = "nodejs";

const statusSchema = z.object({
  is_active: z.boolean({ message: "is_active must be true or false." }),
});

export async function POST(req, { params }) {
  try {
    const session = await requireAdmin(req);
    if (session.error) return session.error;
    const body = await readJson(req);
    const v = validate(statusSchema, body);
    if (v.error) return v.error;

    await ensureDb();
    const { id } = await params;
    const client = await ApiClient.findByPk(id);
    if (!client) return fail("API client not found.", 404);
    client.is_active = v.data.is_active;
    await client.save();
    return ok({
      message: v.data.is_active ? `${client.name} activated.` : `${client.name} revoked — its calls now fail with 401.`,
      is_active: client.is_active,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
