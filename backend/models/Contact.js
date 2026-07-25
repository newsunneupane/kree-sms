const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Contact = sequelize.define('Contact', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  firstname: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  lastname: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  mobile: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
}, {
  tableName: 'contacts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false,
});

module.exports = Contact;