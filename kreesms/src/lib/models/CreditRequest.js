import { DataTypes } from "sequelize";
import { getSequelize } from "../db.js";

const sequelize = getSequelize();

const CreditRequest = sequelize.define(
  "CreditRequest",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    requested_credits: { type: DataTypes.INTEGER, allowNull: false, validate: { min: 1 } },
    payment_reference: { type: DataTypes.STRING(255), allowNull: false },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: "pending",
      validate: { isIn: [["pending", "approved"]] },
    },
  },
  { tableName: "credit_requests", timestamps: true, createdAt: "created_at", updatedAt: false }
);

export default CreditRequest;
