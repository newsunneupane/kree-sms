import { DataTypes } from "sequelize";
import { getSequelize } from "../db.js";

const sequelize = getSequelize();

const SystemSetting = sequelize.define(
  "SystemSetting",
  {
    key: { type: DataTypes.STRING(255), primaryKey: true },
    value: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "system_settings", timestamps: false }
);

export default SystemSetting;
