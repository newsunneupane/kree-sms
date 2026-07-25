const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PendingRegistration = sequelize.define('PendingRegistration', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  otp_code: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'waiting_otp',
    validate: {
      isIn: [['waiting_otp', 'pending_admin_approval']],
    },
  },
}, {
  tableName: 'pending_registrations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = PendingRegistration;