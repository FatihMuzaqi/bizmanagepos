const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Subscription = sequelize.define('Subscription', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    business_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    plan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'TRIAL'
    },
    starts_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    trial_ends_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ends_at: {
      type: DataTypes.DATE,
      allowNull: false
    }
  }, {
    tableName: 'subscriptions',
    timestamps: true,
    underscored: true
  });

  return Subscription;
};
