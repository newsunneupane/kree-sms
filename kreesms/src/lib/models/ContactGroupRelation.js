import { DataTypes } from "sequelize";
import { getSequelize } from "../db.js";

const sequelize = getSequelize();

const ContactGroupRelation = sequelize.define(
  "ContactGroupRelation",
  {
    contact_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
    group_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
  },
  { tableName: "contact_group_relations", timestamps: false }
);

export default ContactGroupRelation;
