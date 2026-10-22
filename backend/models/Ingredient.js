const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Ingredient = sequelize.define('Ingredient', {
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
    unit_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false
    },
    sku: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    minimum_stock: {
      type: DataTypes.DECIMAL(14, 4),
      allowNull: false,
      defaultValue: 0.0000
    },
    cost_per_unit: {
      type: DataTypes.DECIMAL(14, 4),
      allowNull: false,
      defaultValue: 0.0000
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'ingredients',
    timestamps: true,
    underscored: true
  });

  return Ingredient;
};
