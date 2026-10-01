import { Sequelize } from "sequelize";

const globalForSequelize = globalThis;

// Fail fast with an actionable message instead of pg's cryptic
// "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string",
// which is what you get when DB_PASS is missing/empty.
export function requireDbEnv() {
  const missing = ["DB_NAME", "DB_USER", "DB_PASS"].filter((k) => !process.env[k]);
  if (missing.length > 0) {
    const err = new Error(
      `Missing database configuration: ${missing.join(", ")}. Copy .env.example to .env.local and fill in your PostgreSQL values.`
    );
    err.statusCode = 503;
    throw err;
  }
}

function createSequelize() {
  return new Sequelize(
    process.env.DB_NAME || "sms-backend",
    process.env.DB_USER || "postgres",
    // Coerce to string: pg throws "client password must be a string" for non-strings,
    // and normalizes "" away — requireDbEnv() above rejects that case first.
    String(process.env.DB_PASS ?? ""),
    {
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      dialect: "postgres",
      logging: process.env.NODE_ENV === "development" ? console.log : false,
      pool: {
        // Small pool: Vercel serverless functions share nothing, keep per-instance low.
        max: process.env.VERCEL ? 5 : 20,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
      dialectOptions:
        process.env.DB_SSL === "true"
          ? { ssl: { rejectUnauthorized: false } }
          : {},
    }
  );
}

export function getSequelize() {
  // Fingerprint the cache: globalThis survives dev hot-reloads, so an instance
  // created before .env.local existed (empty password) would otherwise stick
  // around forever. Recreate whenever the DB config changes.
  const fingerprint = [
    process.env.DB_HOST,
    process.env.DB_PORT,
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    process.env.DB_SSL,
  ].join("|");
  if (
    !globalForSequelize.__kreesmsSequelize ||
    globalForSequelize.__kreesmsSequelizeFp !== fingerprint
  ) {
    try {
      const old = globalForSequelize.__kreesmsSequelize;
      if (old) old.close().catch(() => {});
    } catch {
      // ignore cleanup errors from the stale instance
    }
    globalForSequelize.__kreesmsSequelize = createSequelize();
    globalForSequelize.__kreesmsSequelizeFp = fingerprint;
  }
  return globalForSequelize.__kreesmsSequelize;
}

// Called from API routes before any query. Safe to call repeatedly.
let synced = false;
export async function ensureDb() {
  requireDbEnv();
  const sequelize = getSequelize();
  try {
    await sequelize.authenticate();
  } catch (err) {
    console.error(
      `[DB] Could not connect to PostgreSQL at ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"} as "${process.env.DB_USER}":`,
      err.message
    );
    const friendly = new Error(
      "Database unavailable. Check DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASS in .env.local and make sure PostgreSQL is running."
    );
    friendly.statusCode = 503;
    throw friendly;
  }
  if (process.env.VERCEL) {
    // On Vercel, tables are managed by scripts/migrate.mjs — never auto-sync per request.
    return sequelize;
  }
  if (!synced && process.env.DB_AUTOSYNC !== "false") {
    await sequelize.sync({ alter: true });
    synced = true;
  }
  return sequelize;
}
