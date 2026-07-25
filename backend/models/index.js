const sequelize = require('../config/db');
const User = require('./User');
const PendingRegistration = require('./PendingRegistration');
const Contact = require('./Contact');
const Group = require('./Group');
const ContactGroupRelation = require('./ContactGroupRelation');
const SmsLog = require('./SmsLog');
const CreditRequest = require('./CreditRequest');
const ScheduledSms = require('./ScheduledSms');
const SystemSetting = require('./SystemSetting');

User.hasMany(Contact, { foreignKey: 'user_id' });
Contact.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Group, { foreignKey: 'user_id' });
Group.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(SmsLog, { foreignKey: 'user_id' });
SmsLog.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(CreditRequest, { foreignKey: 'user_id' });
CreditRequest.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(ScheduledSms, { foreignKey: 'user_id' });
ScheduledSms.belongsTo(User, { foreignKey: 'user_id' });

Contact.belongsToMany(Group, {
  through: ContactGroupRelation,
  foreignKey: 'contact_id',
  otherKey: 'group_id',
});
Group.belongsToMany(Contact, {
  through: ContactGroupRelation,
  foreignKey: 'group_id',
  otherKey: 'contact_id',
});

module.exports = {
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