import { DataTypes } from "sequelize";
import { getSequelize } from "../db.js";

const sequelize = getSequelize();

// Audit trail for every POST /api/public/send-sms attempt — written even when
// auth/rate-limit/validation/provider fails, so per-product analytics and
// abuse investigation never have blind spots. Deliberately separate from
// SmsLog (which keeps full recipient/message PII for the dashboard flow):
// this table stores masked phones + hashes only.
const PublicSmsLog = sequelize.define(
  "PublicSmsLog",
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    api_client_id: { type: DataTypes.UUID, allowNull: true },
    key_prefix: { type: DataTypes.STRING(32), allowNull: true },
    source_url: { type: DataTypes.STRING(500), allowNull: true },
    client_ip_hash: { type: DataTypes.STRING(64), allowNull: true },
    client_ip: { type: DataTypes.STRING(45), allowNull: true },
    method: { type: DataTypes.STRING(10), allowNull: false, defaultValue: "POST" },
    path: { type: DataTypes.STRING(100), allowNull: false, defaultValue: "/api/public/send-sms" },
    status_code: { type: DataTypes.INTEGER, allowNull: false },
    to_masked: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "" },
    to_hash: { type: DataTypes.STRING(64), allowNull: true },
    segments: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    credits_used: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    provider: { type: DataTypes.STRING(20), allowNull: true },
    provider_message_id: { type: DataTypes.STRING(255), allowNull: true },
    latency_ms: { type: DataTypes.INTEGER, allowNull: true },
    error_message: { type: DataTypes.STRING(1000), allowNull: true },
    idempotency_key: { type: DataTypes.STRING(64), allowNull: true },
  },
  {
    tableName: "public_sms_logs",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["api_client_id", "created_at"] },
      { fields: ["status_code", "created_at"] },
      { fields: ["created_at"] },
      { fields: ["api_client_id", "idempotency_key"], unique: true },
    ],
  }
);

export default PublicSmsLog;
