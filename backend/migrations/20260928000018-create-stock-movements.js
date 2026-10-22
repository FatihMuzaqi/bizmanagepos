'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_movements', {
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
      outlet_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'outlets',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      ingredient_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: false,
        references: {
          model: 'ingredients',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      type: {
        type: Sequelize.ENUM('IN', 'OUT', 'ADJUSTMENT'),
        allowNull: false
      },
      quantity: {
        type: Sequelize.DECIMAL(14, 4),
        allowNull: false
      },
      reference_type: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      reference_id: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.BIGINT.UNSIGNED,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    await queryInterface.addIndex('stock_movements', ['business_id', 'outlet_id', 'ingredient_id'], {
      name: 'idx_sm_biz_outlet_ing'
    });

    await queryInterface.addIndex('stock_movements', ['outlet_id', 'created_at'], {
      name: 'idx_sm_outlet_created'
    });

    await queryInterface.addIndex('stock_movements', ['type', 'reference_type'], {
      name: 'idx_sm_type_reftype'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('stock_movements');
  }
};
