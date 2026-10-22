const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Recipe = sequelize.define('Recipe', {
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
    product_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    product_variant_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    tableName: 'recipes',
    timestamps: true,
    underscored: true
  });

  return Recipe;
};
