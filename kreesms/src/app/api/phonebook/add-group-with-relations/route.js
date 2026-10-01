import { ensureDb } from "@/lib/db";
import { Group, ContactGroupRelation, sequelize } from "@/lib/models/index.js";
import { requireUser } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate, addGroupSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    await ensureDb();
  } catch (err) {
    return toErrorResponse(err);
  }
  const t = await sequelize.transaction();
  try {
    const session = await requireUser(req);
    if (session.error) {
      await t.rollback();
      return session.error;
    }

    const body = await readJson(req);
    const v = validate(addGroupSchema, body);
    if (v.error) {
      await t.rollback();
      return v.error;
    }

    const group = await Group.create(
      { user_id: session.user.id, group_name: v.data.group_name, description: v.data.description || "" },
      { transaction: t }
    );
    await ContactGroupRelation.bulkCreate(
      v.data.contact_ids.map((cid) => ({ contact_id: parseInt(cid, 10), group_id: group.id })),
      { ignoreDuplicates: true, transaction: t }
    );
    await t.commit();
    return ok({ message: "Group created." });
  } catch (err) {
    await t.rollback();
    return toErrorResponse(err);
  }
}
