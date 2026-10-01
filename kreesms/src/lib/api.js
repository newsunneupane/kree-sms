import { NextResponse } from "next/server";

export function ok(data = {}, status = 200) {
  return NextResponse.json({ success: true, ...data }, { status });
}

export function fail(message, status = 400, extra = {}) {
  return NextResponse.json({ success: false, message, ...extra }, { status });
}

function sequelizeMessage(err) {
  if (err?.name === "SequelizeValidationError" || err?.name === "SequelizeUniqueConstraintError") {
    return err.errors?.[0]?.message || "Validation error.";
  }
  if (err?.name === "SequelizeForeignKeyConstraintError") {
    return "Referenced record not found.";
  }
  return null;
}

export function toErrorResponse(err) {
  console.error(`[${new Date().toISOString()}] API error:`, err);
  const mapped = sequelizeMessage(err);
  if (mapped) return fail(mapped, 400);
  const status = err?.statusCode || 500;
  return NextResponse.json(
    {
      success: false,
      message: err?.message || "Internal server error.",
      ...(process.env.NODE_ENV === "development" && err?.stack ? { stack: err.stack } : {}),
    },
    { status }
  );
}

export async function readJson(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
