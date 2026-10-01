// Run with: npm run seed
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

const missing = ["DB_NAME", "DB_USER", "DB_PASS"].filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[Seed] Missing in .env.local: ${missing.join(", ")}. Copy .env.example to .env.local first.`);
  process.exit(1);
}

const { User, SystemSetting, sequelize } = await import("../src/lib/models/index.js");

const adminEmail = "admin@kree.com";
try {
  await sequelize.authenticate();
} catch (err) {
  console.error(`[Seed] Could not connect to PostgreSQL at ${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"} as "${process.env.DB_USER}". Check DB_* in .env.local. (${err.message})`);
  process.exit(1);
}
await sequelize.sync();
const existing = await User.findOne({ where: { email: adminEmail } });
if (!existing) {
  await User.create({ name: "Admin", email: adminEmail, password: "Celerioxl12@", role: "admin", sms_balance: 100 });
  console.log("[Seed] Admin user created (admin@kree.com / Celerioxl12@)");
}
await SystemSetting.findOrCreate({ where: { key: "aakash_api_balance" }, defaults: { value: "0" } });
await SystemSetting.findOrCreate({ where: { key: "unallocated_system_balance" }, defaults: { value: "0" } });
console.log("[Seed] System settings initialized.");
process.exit(0);
