const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Payment = sequelize.define('Payment', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    transaction_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    method: {
      type: DataTypes.ENUM('CASH', 'TRANSFER', 'QRIS', 'OTHER'),
      allowNull: false,
      defaultValue: 'CASH'
    },
    amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    paid_amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    change_amount: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    status: {
      type: DataTypes.ENUM('PAID', 'PENDING', 'FAILED', 'REFUNDED'),
      allowNull: false,
      defaultValue: 'PAID'
    },
    paid_at: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'payments',
    timestamps: true,
    underscored: true
  });

  return Payment;
};
