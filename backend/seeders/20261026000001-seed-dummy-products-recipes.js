'use strict';
const seedDummyData = require('../scripts/seedDummyData');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('⚡ Running Sequelize CLI seeder: dummy products, ingredients, recipes & initial stock...');
    await seedDummyData();
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️ Reverting dummy products, ingredients, recipes...');
    const dummyProductSkus = [
      'PRD-TEH-001', 'PRD-TEH-002', 'PRD-TEH-003', 'PRD-TEH-004', 'PRD-TEH-005',
      'PRD-KPI-001', 'PRD-KPI-002', 'PRD-SNK-001', 'PRD-SNK-002', 'PRD-MKG-001'
    ];

    const dummyIngredientSkus = [
      'ING-TEH-01', 'ING-GLA-01', 'ING-SSU-01', 'ING-SKM-01', 'ING-SRP-01',
      'ING-SRP-02', 'ING-SRP-03', 'ING-KPI-01', 'ING-ICE-01', 'ING-CUP-22',
      'ING-CUP-16', 'ING-LID-01', 'ING-PLT-01', 'ING-KTG-01', 'ING-SSS-01',
      'ING-MYK-01', 'ING-BMB-01', 'ING-SAU-01', 'ING-KMS-01', 'ING-BRS-01', 'ING-AYM-01'
    ];

    // Hapus stok pergerakan yang terkait dengan bahan dummy
    const [ingredients] = await queryInterface.sequelize.query(
      `SELECT id FROM ingredients WHERE sku IN (${dummyIngredientSkus.map(s => `'${s}'`).join(',')})`
    );

    if (ingredients.length > 0) {
      const ingIds = ingredients.map(i => i.id).join(',');
      await queryInterface.sequelize.query(
        `DELETE FROM stock_movements WHERE ingredient_id IN (${ingIds}) AND reference_type = 'INITIAL_STOCK'`
      );
    }

    // Hapus resep dan produk dummy
    const [products] = await queryInterface.sequelize.query(
      `SELECT id FROM products WHERE sku IN (${dummyProductSkus.map(s => `'${s}'`).join(',')})`
    );

    if (products.length > 0) {
      const prodIds = products.map(p => p.id).join(',');
      await queryInterface.sequelize.query(`DELETE FROM recipes WHERE product_id IN (${prodIds})`);
      await queryInterface.sequelize.query(`DELETE FROM products WHERE id IN (${prodIds})`);
    }

    // Hapus bahan baku dummy
    await queryInterface.sequelize.query(
      `DELETE FROM ingredients WHERE sku IN (${dummyIngredientSkus.map(s => `'${s}'`).join(',')})`
    );

    console.log('✅ Revert seeder dummy selesai.');
  }
};
