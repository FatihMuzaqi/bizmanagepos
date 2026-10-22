const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RecipeItem = sequelize.define('RecipeItem', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    recipe_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    ingredient_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 4),
      allowNull: false
    }
  }, {
    tableName: 'recipe_items',
    timestamps: true,
    underscored: true
  });

  return RecipeItem;
};
