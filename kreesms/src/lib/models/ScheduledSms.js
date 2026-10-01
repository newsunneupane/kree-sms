import { DataTypes } from "sequelize";
import { getSequelize } from "../db.js";

const sequelize = getSequelize();

const ScheduledSms = sequelize.define(
  "ScheduledSms",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    sms_type: { type: DataTypes.STRING(50), allowNull: true },
    recipient: { type: DataTypes.STRING(20), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: true },
    scheduled_at: { type: DataTypes.DATE, allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "pending",
      validate: { isIn: [["pending", "sent", "failed"]] },
    },
    batch_data: { type: DataTypes.JSONB, allowNull: true },
  },
  { tableName: "scheduled_sms", timestamps: true, createdAt: "created_at", updatedAt: false }
);

export default ScheduledSms;
