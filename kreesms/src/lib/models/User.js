import { DataTypes } from "sequelize";
import { getSequelize } from "../db.js";
import bcrypt from "bcryptjs";

const sequelize = getSequelize();

const User = sequelize.define(
  "User",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(255), allowNull: false, validate: { notEmpty: true } },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true, validate: { isEmail: true } },
    password: { type: DataTypes.STRING(255), allowNull: false },
    role: { type: DataTypes.STRING(20), defaultValue: "user", validate: { isIn: [["user", "admin", "api_client"]] } },
    sms_balance: { type: DataTypes.INTEGER, defaultValue: 0, validate: { min: 0 } },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    defaultScope: { attributes: { exclude: ["password"] } },
    hooks: {
      beforeSave: async (user) => {
        if (user.changed("password")) {
          user.password = await bcrypt.hash(user.password, 12);
        }
      },
    },
  }
);

User.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default User;
