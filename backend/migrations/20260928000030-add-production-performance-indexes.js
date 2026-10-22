'use strict';

/**
 * Migration: Add Performance Indexes for Production
 * Optimizes multi-tenant queries, POS operations, inventory balances, expense reports, and audit trails.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const safeAddIndex = async (tableName, fields, options) => {
      try {
        await queryInterface.addIndex(tableName, fields, options);
      } catch (err) {
        // Ignore if index already exists
        if (!err.message.includes('Duplicate key name') && !err.message.includes('already exists')) {
          console.warn(`[Index Migration Note] ${err.message}`);
        }
      }
    };

    // 1. Business & Members
    await safeAddIndex('businesses', ['owner_id', 'is_active'], { name: 'idx_businesses_owner_active' });
    await safeAddIndex('business_users', ['user_id', 'business_id', 'is_active'], { name: 'idx_business_users_lookup' });
    await safeAddIndex('user_outlets', ['user_id', 'outlet_id'], { name: 'idx_user_outlets_user_outlet' });

    // 2. Product Catalog
    await safeAddIndex('products', ['business_id', 'category_id', 'is_active'], { name: 'idx_products_biz_cat_active' });
    await safeAddIndex('products', ['business_id', 'sku'], { name: 'idx_products_biz_sku' });
    await safeAddIndex('product_variants', ['product_id', 'sku'], { name: 'idx_variants_prod_sku' });

    // 3. Inventory & Recipe
    await safeAddIndex('ingredients', ['business_id', 'unit_id', 'is_active'], { name: 'idx_ingredients_biz_unit_active' });
    await safeAddIndex('stock_movements', ['business_id', 'outlet_id', 'ingredient_id', 'created_at'], { name: 'idx_stock_mv_biz_out_ing_date' });
    await safeAddIndex('stock_movements', ['type', 'created_at'], { name: 'idx_stock_mv_type_date' });
    await safeAddIndex('recipes', ['business_id', 'product_id', 'product_variant_id'], { name: 'idx_recipes_biz_prod_var' });

    // 4. POS & Transactions
    await safeAddIndex('transactions', ['business_id', 'outlet_id', 'created_at'], { name: 'idx_transactions_biz_out_date' });
    await safeAddIndex('transactions', ['business_id', 'invoice_number'], { name: 'idx_transactions_biz_inv' });
    await safeAddIndex('transactions', ['user_id', 'created_at'], { name: 'idx_transactions_user_date' });
    await safeAddIndex('transaction_items', ['transaction_id', 'product_id'], { name: 'idx_tx_items_tx_prod' });

    // 5. Expenses
    await safeAddIndex('expenses', ['business_id', 'outlet_id', 'expense_date'], { name: 'idx_expenses_biz_out_date' });
    await safeAddIndex('expenses', ['category_id', 'status'], { name: 'idx_expenses_cat_status' });

    // 6. Audit Logs
    await safeAddIndex('audit_logs', ['business_id', 'action', 'created_at'], { name: 'idx_audit_logs_biz_action_date' });
    await safeAddIndex('audit_logs', ['entity_type', 'entity_id'], { name: 'idx_audit_logs_entity' });
  },

  async down(queryInterface, Sequelize) {
    const safeRemoveIndex = async (tableName, indexName) => {
      try {
        await queryInterface.removeIndex(tableName, indexName);
      } catch (err) {
        // Ignore if index doesn't exist
      }
    };

    await safeRemoveIndex('businesses', 'idx_businesses_owner_active');
    await safeRemoveIndex('business_users', 'idx_business_users_lookup');
    await safeRemoveIndex('user_outlets', 'idx_user_outlets_user_outlet');
    await safeRemoveIndex('products', 'idx_products_biz_cat_active');
    await safeRemoveIndex('products', 'idx_products_biz_sku');
    await safeRemoveIndex('product_variants', 'idx_variants_prod_sku');
    await safeRemoveIndex('ingredients', 'idx_ingredients_biz_unit_active');
    await safeRemoveIndex('stock_movements', 'idx_stock_mv_biz_out_ing_date');
    await safeRemoveIndex('stock_movements', 'idx_stock_mv_type_date');
    await safeRemoveIndex('recipes', 'idx_recipes_biz_prod_var');
    await safeRemoveIndex('transactions', 'idx_transactions_biz_out_date');
    await safeRemoveIndex('transactions', 'idx_transactions_biz_inv');
    await safeRemoveIndex('transactions', 'idx_transactions_user_date');
    await safeRemoveIndex('transaction_items', 'idx_tx_items_tx_prod');
    await safeRemoveIndex('expenses', 'idx_expenses_biz_out_date');
    await safeRemoveIndex('expenses', 'idx_expenses_cat_status');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_biz_action_date');
    await safeRemoveIndex('audit_logs', 'idx_audit_logs_entity');
  }
};
