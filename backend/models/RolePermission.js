const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const RolePermission = sequelize.define('RolePermission', {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    role_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    },
    permission_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false
    }
  }, {
    tableName: 'role_permissions',
    timestamps: true,
    updatedAt: false,
    underscored: true
  });

  return RolePermission;
};
