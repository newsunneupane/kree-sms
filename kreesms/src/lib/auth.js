import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { User } from "./models/index.js";

export const TOKEN_COOKIE = "kreesms_token";

export function signToken(user) {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not set");
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

export function sanitizeUser(user) {
  const u = user.toJSON ? user.toJSON() : { ...user };
  delete u.password;
  return u;
}

function tokenFromRequest(req) {
  const cookieToken = req.cookies?.get?.(TOKEN_COOKIE)?.value;
  if (cookieToken) return cookieToken;
  const header = req.headers.get("authorization");
  if (header?.startsWith("Bearer ")) return header.slice(7);
  return null;
}

// Returns { user } or null. Never throws for missing/invalid token.
export async function getSession(req) {
  try {
    const token = tokenFromRequest(req);
    if (!token) return null;
    const decoded = verifyToken(token);
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ["password"] },
    });
    if (!user) return null;
    return { user, decoded };
  } catch {
    return null;
  }
}

export async function requireUser(req) {
  const session = await getSession(req);
  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, message: "Access denied. Please login again." },
        { status: 401 }
      ),
    };
  }
  return session;
}

export async function requireAdmin(req) {
  const session = await getSession(req);
  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, message: "Access denied. Please login again." },
        { status: 401 }
      ),
    };
  }
  if (session.user.role !== "admin") {
    return {
      error: NextResponse.json(
        { success: false, message: "Access denied. Admins only." },
        { status: 403 }
      ),
    };
  }
  return session;
}

// API holder panel guard: session must belong to a User with role
// "api_client" whose linked ApiClient exists and is active. Revoking the
// client instantly locks the panel too — no separate switch needed.
export async function requireApiClient(req) {
  const session = await getSession(req);
  if (!session) {
    return {
      error: NextResponse.json(
        { success: false, message: "Access denied. Please login again." },
        { status: 401 }
      ),
    };
  }
  if (session.user.role !== "api_client") {
    return {
      error: NextResponse.json(
        { success: false, message: "Access denied. API clients only." },
        { status: 403 }
      ),
    };
  }
  const { ApiClient } = await import("./models/index.js");
  const apiClient = await ApiClient.findOne({ where: { user_id: session.user.id } });
  if (!apiClient || !apiClient.is_active) {
    return {
      error: NextResponse.json(
        { success: false, message: "API access deactivated. Contact administrator." },
        { status: 403 }
      ),
    };
  }
  return { user: session.user, apiClient };
}

export function authCookieHeader(token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${TOKEN_COOKIE}=${token}; HttpOnly; Path=/; Max-Age=${7 * 24 * 3600}; SameSite=Lax${secure}`;
}

export function clearAuthCookieHeader() {
  return `${TOKEN_COOKIE}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`;
}
