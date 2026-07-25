const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ContactGroupRelation = sequelize.define('ContactGroupRelation', {
  contact_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
  group_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    primaryKey: true,
  },
}, {
  tableName: 'contact_group_relations',
  timestamps: false,
});

module.exports = ContactGroupRelation;