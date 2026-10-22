const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const UserRole = sequelize.define('UserRole', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    business_user_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    role_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'user_roles',
    timestamps: true,
    updatedAt: false,
    underscored: true
  });

  return UserRole;
};
