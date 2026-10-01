import { ensureDb } from "@/lib/db";
import { User, PendingRegistration } from "@/lib/models/index.js";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate, verifyOtpSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const body = await readJson(req);
    const v = validate(verifyOtpSchema, body);
    if (v.error) return v.error;
    const { email, otp } = v.data;

    await ensureDb();
    const staged = await PendingRegistration.findOne({ where: { email, status: "waiting_otp" } });
    if (!staged || staged.otp_code !== otp) {
      return fail("Invalid or expired verification code.", 400);
    }

    // Password is already bcrypt-hashed at staging time — skip hooks to avoid double-hashing.
    await User.create(
      { name: staged.name, email: staged.email, password: staged.password, role: "user", sms_balance: 0 },
      { hooks: false }
    );
    await staged.destroy();

    return ok({ message: "Email verified! Your account is now active. Please sign in." });
  } catch (err) {
    return toErrorResponse(err);
  }
}
