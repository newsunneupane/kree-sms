import { z } from "zod";
import { ensureDb } from "@/lib/db";
import { User, PendingRegistration, sequelize } from "@/lib/models/index.js";
import { requireAdmin } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate } from "@/lib/validators";

export const runtime = "nodejs";

const schema = z.object({ registration_id: z.coerce.number().int() });

export async function POST(req) {
  try {
    await ensureDb();
  } catch (err) {
    return toErrorResponse(err);
  }
  const t = await sequelize.transaction();
  try {
    const session = await requireAdmin(req);
    if (session.error) {
      await t.rollback();
      return session.error;
    }

    const body = await readJson(req);
    const v = validate(schema, body);
    if (v.error) {
      await t.rollback();
      return v.error;
    }

    const pending = await PendingRegistration.findByPk(v.data.registration_id, {
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!pending || pending.status !== "pending_admin_approval") {
      await t.rollback();
      return fail("Registration not found or already processed.", 400);
    }

    await User.create(
      { name: pending.name, email: pending.email, password: pending.password, role: "user", sms_balance: 0 },
      { hooks: false, transaction: t }
    );
    await pending.destroy({ transaction: t });
    await t.commit();
    return ok({ message: "User approved and registered." });
  } catch (err) {
    await t.rollback();
    return toErrorResponse(err);
  }
}
