const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserOutlet = sequelize.define('UserOutlet', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    outlet_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'user_outlets',
    timestamps: true,
    updatedAt: false, // only created_at
    underscored: true
  });

  return UserOutlet;
};
