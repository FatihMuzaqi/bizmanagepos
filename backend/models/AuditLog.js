'use strict';
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AuditLog = sequelize.define(
    'AuditLog',
    {
      id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      business_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
      },
      user_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true
      },
      action: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      entity_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      entity_id: {
        type: DataTypes.STRING(50),
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSON,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      tableName: 'audit_logs',
      timestamps: false,
      underscored: true
    }
  );

  return AuditLog;
};
