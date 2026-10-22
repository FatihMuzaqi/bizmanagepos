const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SubscriptionInvoice = sequelize.define('SubscriptionInvoice', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    order_id: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true
    },
    business_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    plan_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    subscription_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'PAID', 'EXPIRED', 'FAILED', 'CANCELLED'),
      allowNull: false,
      defaultValue: 'PENDING'
    },
    payment_type: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    snap_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    snap_redirect_url: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    midtrans_response: {
      type: DataTypes.JSON,
      allowNull: true
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'subscription_invoices',
    timestamps: true,
    underscored: true
  });

  return SubscriptionInvoice;
};
