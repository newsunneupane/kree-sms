import { ensureDb } from "@/lib/db";
import { Contact } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate, addBulkContactsSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const session = await requireUser(req);
    if (session.error) return session.error;

    const body = await readJson(req);
    const v = validate(addBulkContactsSchema, body);
    if (v.error) return v.error;

    const validContacts = v.data.contacts.filter((c) => c.firstname?.trim() && c.mobile?.trim());
    if (validContacts.length === 0) return fail("No valid contacts found in data.", 400);

    await ensureDb();
    await Contact.bulkCreate(
      validContacts.map((c) => ({
        user_id: session.user.id,
        firstname: c.firstname.trim(),
        lastname: (c.lastname || "").trim(),
        mobile: c.mobile.trim(),
      }))
    );
    return ok({ message: `Imported ${validContacts.length} contacts.` });
  } catch (err) {
    return toErrorResponse(err);
  }
}
