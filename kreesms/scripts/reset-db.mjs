// DANGER: deletes ALL data except the admin login. Run with: npm run reset-db -- --confirm
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

if (!process.argv.includes("--confirm")) {
  console.error("[Reset] Refusing to wipe without --confirm. Run: npm run reset-db -- --confirm");
  process.exit(1);
}

const missing = ["DB_NAME", "DB_USER", "DB_PASS"].filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error(`[Reset] Missing in .env.local: ${missing.join(", ")}.`);
  process.exit(1);
}

const { sequelize, User, SystemSetting } = await import("../src/lib/models/index.js");

const ADMIN_EMAIL = "admin@kreesms.com";

try {
  await sequelize.authenticate();

  const [[{ count: userCount }]] = await sequelize.query(
    `SELECT COUNT(*)::int AS count FROM users WHERE email <> :admin`,
    { replacements: { admin: ADMIN_EMAIL } }
  );
  console.log(`[Reset] This will delete ${userCount} non-admin user(s) and ALL contacts, groups, sms logs, credit requests, scheduled sms and pending registrations.`);

  await sequelize.transaction(async (t) => {
    // Child / transient tables: empty fully and restart their id sequences.
    await sequelize.query(
      `TRUNCATE contacts, groups, contact_group_relations, sms_logs, credit_requests, scheduled_sms, pending_registrations RESTART IDENTITY CASCADE`,
      { transaction: t }
    );
    // Users: keep only the admin login.
    await sequelize.query(`DELETE FROM users WHERE email <> :admin`, {
      replacements: { admin: ADMIN_EMAIL },
      transaction: t,
    });
    await sequelize.query(`SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users), 1))`, {
      transaction: t,
    });
  });

  // Ensure the admin login still exists (recreate with default password if it was missing).
  const admin = await User.findOne({ where: { email: ADMIN_EMAIL } });
  if (!admin) {
    await User.create({ name: "Admin", email: ADMIN_EMAIL, password: "Admin@123", role: "admin", sms_balance: 100 });
    console.log("[Reset] Admin did not exist — recreated admin@kreesms.com / Admin@123.");
  } else {
    console.log(`[Reset] Kept admin login: ${admin.email} (id ${admin.id}). Password unchanged.`);
  }

  // Reset gateway/stock counters to a clean slate.
  await SystemSetting.upsert({ key: "aakash_api_balance", value: "0" });
  await SystemSetting.upsert({ key: "unallocated_system_balance", value: "0" });
  console.log("[Reset] System settings reset to 0.");

  const [[{ count: remaining }]] = await sequelize.query(`SELECT COUNT(*)::int AS count FROM users`);
  console.log(`[Reset] Done. users table now holds ${remaining} row(s).`);
  process.exit(0);
} catch (err) {
  console.error("[Reset] Error:", err.message);
  process.exit(1);
}
