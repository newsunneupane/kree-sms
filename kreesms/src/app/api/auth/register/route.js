import bcrypt from "bcryptjs";
import { ensureDb } from "@/lib/db";
import { User, PendingRegistration } from "@/lib/models/index.js";
import { sendOtpEmail } from "@/lib/email";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate, registerSchema } from "@/lib/validators";
import { authLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const limited = authLimiter(req);
    if (limited.limited) return limited.response;

    const body = await readJson(req);
    const v = validate(registerSchema, body);
    if (v.error) return v.error;
    const { name, email, password } = v.data;

    await ensureDb();
    const existing = await User.findOne({ where: { email } });
    if (existing) return fail("An account with this email already exists.", 409);

    const hashedPassword = await bcrypt.hash(password, 12);
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    await PendingRegistration.destroy({ where: { email } });
    await PendingRegistration.create({ name, email, password: hashedPassword, otp_code: otp, status: "waiting_otp" });
    await sendOtpEmail(email, name, otp);

    return ok({
      message: "Verification code sent. Check your email inbox.",
      ...(process.env.NODE_ENV === "development" ? { otp } : {}),
    });
  } catch (err) {
    return toErrorResponse(err);
  }
}
