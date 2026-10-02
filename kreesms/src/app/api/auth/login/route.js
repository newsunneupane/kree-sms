import { ensureDb } from "@/lib/db";
import { User } from "@/lib/models/index.js";
import { signToken, sanitizeUser, authCookieHeader } from "@/lib/auth";
import { ok, fail, toErrorResponse, readJson } from "@/lib/api";
import { validate, loginSchema } from "@/lib/validators";
import { authLimiter } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(req) {
  try {
    const limited = authLimiter(req);
    if (limited.limited) return limited.response;

    const body = await readJson(req);
    const v = validate(loginSchema, body);
    if (v.error) return v.error;

    await ensureDb();
    const user = await User.scope(null).findOne({ where: { email: v.data.email } });
    if (!user) return fail("Invalid email or password.", 401);

    const isMatch = await user.comparePassword(v.data.password);
    if (!isMatch) return fail("Invalid email or password.", 401);

    // Revoked API holders lose panel access together with their HMAC key.
    if (user.role === "api_client") {
      const { ApiClient } = await import("@/lib/models/index.js");
      const linked = await ApiClient.findOne({ where: { user_id: user.id } });
      if (!linked || !linked.is_active) {
        return fail("API access deactivated. Contact administrator.", 403);
      }
    }

    const token = signToken(user);
    const res = ok({ user: sanitizeUser(user), token });
    res.headers.set("Set-Cookie", authCookieHeader(token));
    return res;
  } catch (err) {
    return toErrorResponse(err);
  }
}
