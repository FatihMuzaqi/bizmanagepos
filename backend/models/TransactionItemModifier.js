const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const TransactionItemModifier = sequelize.define('TransactionItemModifier', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    transaction_item_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    modifier_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    modifier_option_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0.00
    }
  }, {
    tableName: 'transaction_item_modifiers',
    timestamps: true,
    underscored: true
  });

  return TransactionItemModifier;
};
