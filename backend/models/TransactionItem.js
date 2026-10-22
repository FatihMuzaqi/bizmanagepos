const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TransactionItem = sequelize.define('TransactionItem', {
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
    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    variant_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    product_name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    variant_name: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 4),
      allowNull: false,
      defaultValue: 1.0000
    },
    unit_price: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.00
    },
    subtotal: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.00
    }
  }, {
    tableName: 'transaction_items',
    timestamps: true,
    underscored: true
  });

  return TransactionItem;
};
