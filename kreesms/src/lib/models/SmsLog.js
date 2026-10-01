import { DataTypes } from "sequelize";
import { getSequelize } from "../db.js";

const sequelize = getSequelize();

const SmsLog = sequelize.define(
  "SmsLog",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    sms_type: { type: DataTypes.STRING(50), allowNull: true },
    recipient: { type: DataTypes.STRING(20), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.STRING(20), allowNull: true },
    gateway_response: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "sms_logs", timestamps: true, createdAt: "created_at", updatedAt: false }
);

export default SmsLog;
