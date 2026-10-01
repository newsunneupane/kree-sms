import { ensureDb } from "@/lib/db";
import { Contact, Group } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, toErrorResponse } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(req) {
  try {
    const session = await requireUser(req);
    if (session.error) return session.error;
    const userId = session.user.id;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10) || 25, 100);
    const offset = (page - 1) * limit;

    await ensureDb();
    const groups = await Group.findAll({ where: { user_id: userId }, order: [["group_name", "ASC"]] });
    const totalContacts = await Contact.count({ where: { user_id: userId } });
    const contacts = await Contact.findAll({
      where: { user_id: userId },
      include: [{ model: Group, through: { attributes: [] }, attributes: ["group_name"] }],
      order: [["id", "DESC"]],
      limit,
      offset,
    });

    return ok({
      groups,
      contacts: contacts.map((c) => ({
        id: c.id,
        firstname: c.firstname,
        lastname: c.lastname,
        mobile: c.mobile,
        group_name: c.Groups?.length > 0 ? c.Groups.map((g) => g.group_name).join(", ") : "No group",
      })),
      total_contacts: totalContacts,
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
