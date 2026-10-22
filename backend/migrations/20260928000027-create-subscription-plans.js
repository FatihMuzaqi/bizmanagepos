'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('subscription_plans', {
      id: {
        type: Sequelize.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      price: {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0.00
      },
      duration_days: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      max_users: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      max_outlets: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1
      },
      max_products: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 50
      },
      max_transactions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 500
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

    await queryInterface.addIndex('subscription_plans', ['code'], {
      unique: true,
      name: 'uq_sub_plans_code'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('subscription_plans');
  }
};
