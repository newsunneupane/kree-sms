"use client";

// Single fetch wrapper for the merged app: same-origin /api routes,
// JWT travels in the httpOnly cookie (set on login), so no token handling here.
export async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: "Invalid server response." };
  }
  if (res.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem("sms_session");
  }
  return data;
}

export function getStoredSession() {
  try {
    const raw = localStorage.getItem("sms_session");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setStoredSession(user) {
  localStorage.setItem("sms_session", JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem("sms_session");
}
