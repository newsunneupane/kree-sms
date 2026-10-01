import { clearAuthCookieHeader } from "@/lib/auth";
import { ok } from "@/lib/api";

export const runtime = "nodejs";

export async function POST() {
  const res = ok({ message: "Logged out." });
  res.headers.set("Set-Cookie", clearAuthCookieHeader());
  return res;
}
