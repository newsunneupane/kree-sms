import { getSequelize } from "../db.js";
import User from "./User.js";
import PendingRegistration from "./PendingRegistration.js";
import Contact from "./Contact.js";
import Group from "./Group.js";
import ContactGroupRelation from "./ContactGroupRelation.js";
import SmsLog from "./SmsLog.js";
import CreditRequest from "./CreditRequest.js";
import ScheduledSms from "./ScheduledSms.js";
import SystemSetting from "./SystemSetting.js";

User.hasMany(Contact, { foreignKey: "user_id" });
Contact.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Group, { foreignKey: "user_id" });
Group.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(SmsLog, { foreignKey: "user_id" });
SmsLog.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(CreditRequest, { foreignKey: "user_id" });
CreditRequest.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(ScheduledSms, { foreignKey: "user_id" });
ScheduledSms.belongsTo(User, { foreignKey: "user_id" });

Contact.belongsToMany(Group, {
  through: ContactGroupRelation,
  foreignKey: "contact_id",
  otherKey: "group_id",
});
Group.belongsToMany(Contact, {
  through: ContactGroupRelation,
  foreignKey: "group_id",
  otherKey: "contact_id",
});

const sequelize = getSequelize();

export {
  sequelize,
  User,
  PendingRegistration,
  Contact,
  Group,
  ContactGroupRelation,
  SmsLog,
  CreditRequest,
  ScheduledSms,
  SystemSetting,
};
