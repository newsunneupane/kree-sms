import { ensureDb } from "@/lib/db";
import { Contact, Group } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, fail, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireUser(req);
    if (session.error) return session.error;
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const groupId = parseInt(searchParams.get("group_id") || "", 10);
    if (!groupId) return fail("Group ID required.", 400);

    await ensureDb();
    const contacts = await Contact.findAll({
      include: [{ model: Group, through: { attributes: [] }, where: { id: groupId }, required: true }],
      where: { user_id: userId },
      order: [["firstname", "ASC"]],
    });

    return ok({
      members: contacts.map((c) => ({ id: c.id, firstname: c.firstname, lastname: c.lastname, mobile: c.mobile })),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
