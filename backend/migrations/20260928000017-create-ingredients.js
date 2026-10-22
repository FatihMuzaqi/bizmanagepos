'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('ingredients', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      business_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'businesses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      unit_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'units',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      name: {
        type: Sequelize.STRING(150),
        allowNull: false
      },
      sku: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      minimum_stock: {
        type: Sequelize.DECIMAL(14, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      cost_per_unit: {
        type: Sequelize.DECIMAL(14, 4),
        allowNull: false,
        defaultValue: 0.0000
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addConstraint('ingredients', {
      fields: ['business_id', 'name'],
      type: 'unique',
      name: 'uq_ingredients_business_name'
    });

    await queryInterface.addIndex('ingredients', ['business_id', 'sku'], {
      name: 'idx_ingredients_business_sku'
    });

    await queryInterface.addIndex('ingredients', ['business_id', 'is_active'], {
      name: 'idx_ingredients_business_active'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('ingredients');
  }
};
