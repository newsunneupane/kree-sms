import { ensureDb } from "@/lib/db";
import { Contact } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, toErrorResponse, readJson } from "@/lib/api";
import { validate, addContactSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const session = await requireUser(req);
    if (session.error) return session.error;

    const body = await readJson(req);
    const v = validate(addContactSchema, body);
    if (v.error) return v.error;

    await ensureDb();
    await Contact.create({ user_id: session.user.id, firstname: v.data.firstname, lastname: v.data.lastname || "", mobile: v.data.mobile });
    return ok({ message: "Contact added." });
  } catch (err) {
    return toErrorResponse(err);
  }
}
