import { NextResponse } from "next/server";

// Keep in sync with TOKEN_COOKIE in src/lib/auth.js (inlined here because
// middleware runs on the edge runtime and cannot import node-only modules).
const TOKEN_COOKIE = "kreesms_token";

const PUBLIC_API_PREFIXES = ["/api/auth/", "/api/health", "/api/cron/"];

// Edge-safe guard: requires a token to be PRESENT on protected /api routes.
// Full JWT verification + DB lookup happens in each route (Node runtime).
export default function proxy(req) {
  const { pathname } = req.nextUrl;
  if (!pathname.startsWith("/api/")) return NextResponse.next();
  if (PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const cookieToken = req.cookies.get(TOKEN_COOKIE)?.value;
  const bearer = req.headers.get("authorization");
  if (!cookieToken && !bearer?.startsWith("Bearer ")) {
    return NextResponse.json(
      { success: false, message: "Access denied. Please login again." },
      { status: 401 }
    );
  }
  return NextResponse.next();
}

export const config = { matcher: ["/api/:path*"] };
