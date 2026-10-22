const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ProductModifier = sequelize.define('ProductModifier', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    modifier_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'product_modifiers',
    timestamps: true,
    updatedAt: false,
    underscored: true
  });

  return ProductModifier;
};
