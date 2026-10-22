'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const permissions = [
      // Dashboard
      { name: 'dashboard.view', group: 'dashboard', description: 'View dashboard overview and analytics' },

      // Business
      { name: 'business.view', group: 'business', description: 'View business profile and information' },
      { name: 'business.update', group: 'business', description: 'Update business profile settings' },

      // Outlets
      { name: 'outlet.view', group: 'outlet', description: 'View outlet list and details' },
      { name: 'outlet.create', group: 'outlet', description: 'Create new outlet branch' },
      { name: 'outlet.update', group: 'outlet', description: 'Update outlet information' },
      { name: 'outlet.delete', group: 'outlet', description: 'Delete or deactivate outlet' },

      // Categories
      { name: 'category.view', group: 'category', description: 'View product categories' },
      { name: 'category.create', group: 'category', description: 'Create new product category' },
      { name: 'category.update', group: 'category', description: 'Update product category' },
      { name: 'category.delete', group: 'category', description: 'Delete product category' },

      // Products
      { name: 'product.view', group: 'product', description: 'View products, variants, and modifiers' },
      { name: 'product.create', group: 'product', description: 'Create new product' },
      { name: 'product.update', group: 'product', description: 'Update product information and pricing' },
      { name: 'product.delete', group: 'product', description: 'Delete or deactivate product' },

      // Product Variants
      { name: 'variant.view', group: 'product', description: 'View product variants' },
      { name: 'variant.create', group: 'product', description: 'Create product variant' },
      { name: 'variant.update', group: 'product', description: 'Update product variant' },
      { name: 'variant.delete', group: 'product', description: 'Delete product variant' },

      // Modifiers
      { name: 'modifier.view', group: 'product', description: 'View modifiers and options' },
      { name: 'modifier.create', group: 'product', description: 'Create modifier and options' },
      { name: 'modifier.update', group: 'product', description: 'Update modifier and options' },
      { name: 'modifier.delete', group: 'product', description: 'Delete modifier' },

      // Units
      { name: 'unit.view', group: 'unit', description: 'View measurement units' },
      { name: 'unit.create', group: 'unit', description: 'Create measurement unit' },
      { name: 'unit.update', group: 'unit', description: 'Update measurement unit' },
      { name: 'unit.delete', group: 'unit', description: 'Delete measurement unit' },

      // Inventory & Recipes
      { name: 'inventory.view', group: 'inventory', description: 'View raw ingredients and stock levels' },
      { name: 'inventory.create', group: 'inventory', description: 'Create new ingredient item' },
      { name: 'inventory.update', group: 'inventory', description: 'Update ingredient information' },
      { name: 'inventory.delete', group: 'inventory', description: 'Delete or deactivate ingredient' },
      { name: 'inventory.adjust', group: 'inventory', description: 'Perform stock opname and manual adjustments' },
      { name: 'recipe.view', group: 'recipe', description: 'View product recipes and ingredient compositions' },
      { name: 'recipe.manage', group: 'recipe', description: 'Manage product recipes' },
      { name: 'recipe.create', group: 'recipe', description: 'Create product recipe' },
      { name: 'recipe.update', group: 'recipe', description: 'Update product recipe' },
      { name: 'recipe.delete', group: 'recipe', description: 'Delete product recipe' },

      // Sales & POS
      { name: 'sales.view', group: 'sales', description: 'View sales transactions and history' },
      { name: 'sales.create', group: 'sales', description: 'Process checkout and create new sales order' },
      { name: 'sales.cancel', group: 'sales', description: 'Void or cancel completed transactions' },

      // Expenses
      { name: 'expense.view', group: 'expense', description: 'View operational expenses' },
      { name: 'expense.create', group: 'expense', description: 'Record new operational expense' },
      { name: 'expense.update', group: 'expense', description: 'Update expense record' },
      { name: 'expense.delete', group: 'expense', description: 'Delete expense record' },

      // Employees & Roles
      { name: 'employee.view', group: 'employee', description: 'View staff members and assignments' },
      { name: 'employee.create', group: 'employee', description: 'Add new staff member' },
      { name: 'employee.update', group: 'employee', description: 'Update staff roles and outlet permissions' },
      { name: 'employee.delete', group: 'employee', description: 'Remove or deactivate staff member' },
      { name: 'role.view', group: 'employee', description: 'View dynamic roles' },
      { name: 'role.manage', group: 'employee', description: 'Create and manage custom roles' },

      // Reports
      { name: 'report.view', group: 'report', description: 'View sales, profit & loss, and operational reports' },
      { name: 'report.export', group: 'report', description: 'Export report data to Excel / PDF' },

      // SaaS Subscriptions
      { name: 'subscription.view', group: 'subscription', description: 'View SaaS subscription and plan usage' },
      { name: 'subscription.manage', group: 'subscription', description: 'Manage subscription plans and billing' }
    ];

    const records = permissions.map(p => ({
      ...p,
      created_at: new Date()
    }));

    // Insert ignore duplicates
    await queryInterface.bulkInsert('permissions', records, {
      updateOnDuplicate: ['group', 'description']
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('permissions', null, {});
  }
};
