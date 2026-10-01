// Run with: npm run migrate (loads .env.local for local runs)
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const missing = ["DB_NAME", "DB_USER", "DB_PASS"].filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[Migrate] Missing in .env.local: ${missing.join(", ")}. Copy .env.example to .env.local first.`);
  process.exit(1);
}

const { sequelize } = await import("../src/lib/models/index.js");

try {
  await sequelize.authenticate();
  console.log("[Migrate] Database connected.");
  await sequelize.sync({ alter: true });
  console.log("[Migrate] Tables synced (alter mode).");
  process.exit(0);
} catch (err) {
  console.error("[Migrate] Error:", err);
  process.exit(1);
}
