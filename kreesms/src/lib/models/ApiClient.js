import { DataTypes } from "sequelize";
import { getSequelize } from "../db.js";

const sequelize = getSequelize();

// One row per external product (school MIS, restaurant, accounting app).
// Authenticates via API key + HMAC (see src/lib/public-auth.js) — never
// shares the session-cookie flow in src/lib/auth.js, and carries its own
// prepaid sms_balance (distinct from User.sms_balance) so third-party spend
// is isolated per product.
const ApiClient = sequelize.define(
  "ApiClient",
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    name: { type: DataTypes.STRING(120), allowNull: false, validate: { notEmpty: true } },
    product: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "school",
      validate: { isIn: [["school", "restaurant", "accounting", "other"]] },
    },
    key_prefix: { type: DataTypes.STRING(32), allowNull: false, unique: true },
    key_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    // AES-256-GCM envelope of the raw secret (key from SMS_HMAC_PEPPER), so
    // the server can recompute HMACs without persisting the secret itself.
    secret_enc: { type: DataTypes.TEXT, allowNull: false },
    allowed_ips: { type: DataTypes.ARRAY(DataTypes.STRING(45)), allowNull: false, defaultValue: [] },
    allowed_origins: { type: DataTypes.ARRAY(DataTypes.STRING(500)), allowNull: false, defaultValue: [] },
    rate_limit_per_min: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60, validate: { min: 1, max: 1000 } },
    sms_balance: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, validate: { min: 0 } },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  { tableName: "api_clients", timestamps: true, createdAt: "created_at", updatedAt: "updated_at" }
);

export default ApiClient;
