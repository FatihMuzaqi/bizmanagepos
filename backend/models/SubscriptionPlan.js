const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionPlan = sequelize.define('SubscriptionPlan', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    duration_days: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30
    },
    max_users: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    max_outlets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    max_products: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50
    },
    max_transactions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 500
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'subscription_plans',
    timestamps: true,
    underscored: true
  });

  return SubscriptionPlan;
};
