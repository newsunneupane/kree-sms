const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const SystemSetting = sequelize.define('SystemSetting', {
  key: {
    type: DataTypes.STRING(255),
    primaryKey: true,
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'system_settings',
  timestamps: false,
});

module.exports = SystemSetting;