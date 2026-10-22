const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StockMovement = sequelize.define('StockMovement', {
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
    outlet_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    ingredient_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('IN', 'OUT', 'ADJUSTMENT'),
      allowNull: false
    },
    quantity: {
      type: DataTypes.DECIMAL(14, 4),
      allowNull: false
    },
    reference_type: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    reference_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true
    }
  }, {
    tableName: 'stock_movements',
    timestamps: true,
    underscored: true
  });

  return StockMovement;
};
