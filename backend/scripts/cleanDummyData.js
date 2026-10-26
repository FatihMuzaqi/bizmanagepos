'use strict';
require('dotenv').config();
const { sequelize } = require('../models');

/**
 * UsahaKu - Script Membersihkan Khusus Data Dummy (Produk, Resep, Bahan Baku, Stok Awal)
 * Menjaga akun pengguna, bisnis, outlet, dan permissions tetap utuh.
 */
async function cleanDummyData() {
  console.log('====================================================');
  console.log('🧹 MEMBERSIHKAN DATA DUMMY PRODUK, RESEP & BAHAN BAKU');
  console.log('====================================================\n');

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

  const dummyCategoryNames = [
    'Minuman Es Teh', 'Minuman Kopi & Susu', 'Makanan Ringan / Snack', 'Makanan Utama'
  ];

  const t = await sequelize.transaction();

  try {
    // 1. Matikan foreign key checks sementara untuk menghindari constraint error
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0;', { transaction: t });

    // 2. Dapatkan ID produk dummy
    const [products] = await sequelize.query(
      `SELECT id, name FROM products WHERE sku IN (${dummyProductSkus.map(s => `'${s}'`).join(',')})`,
      { transaction: t }
    );
    const prodIds = products.map(p => p.id);

    // 3. Dapatkan ID bahan baku dummy
    const [ingredients] = await sequelize.query(
      `SELECT id, name FROM ingredients WHERE sku IN (${dummyIngredientSkus.map(s => `'${s}'`).join(',')})`,
      { transaction: t }
    );
    const ingIds = ingredients.map(i => i.id);

    // 4. Hapus Pergerakan Stok (Stock Movement) yang terkait dengan bahan dummy
    if (ingIds.length > 0) {
      const ingListStr = ingIds.join(',');
      await sequelize.query(`DELETE FROM stock_movements WHERE ingredient_id IN (${ingListStr});`, { transaction: t });
      console.log(`✓ Riwayat mutasi stok untuk ${ingIds.length} bahan baku dummy dihapus.`);
    }

    // 5. Hapus Resep & Komposisi Resep
    if (prodIds.length > 0) {
      const prodListStr = prodIds.join(',');
      const [recipes] = await sequelize.query(`SELECT id FROM recipes WHERE product_id IN (${prodListStr});`, { transaction: t });
      if (recipes.length > 0) {
        const recipeIdsStr = recipes.map(r => r.id).join(',');
        await sequelize.query(`DELETE FROM recipe_items WHERE recipe_id IN (${recipeIdsStr});`, { transaction: t });
        await sequelize.query(`DELETE FROM recipes WHERE id IN (${recipeIdsStr});`, { transaction: t });
      }
      console.log(`✓ Resep dan item resep untuk ${products.length} menu dummy dihapus.`);

      // Hapus transaksi uji coba yang menggunakan produk dummy
      const [transItems] = await sequelize.query(
        `SELECT transaction_id FROM transaction_items WHERE product_id IN (${prodListStr});`,
        { transaction: t }
      );
      if (transItems.length > 0) {
        const transIdsStr = transItems.map(ti => ti.transaction_id).join(',');
        await sequelize.query(`DELETE FROM transaction_item_modifiers WHERE transaction_item_id IN (SELECT id FROM transaction_items WHERE transaction_id IN (${transIdsStr}));`, { transaction: t });
        await sequelize.query(`DELETE FROM transaction_items WHERE transaction_id IN (${transIdsStr});`, { transaction: t });
        await sequelize.query(`DELETE FROM payments WHERE transaction_id IN (${transIdsStr});`, { transaction: t });
        await sequelize.query(`DELETE FROM transactions WHERE id IN (${transIdsStr});`, { transaction: t });
        console.log(`✓ Transaksi pengujian yang menggunakan produk dummy dibersihkan.`);
      }

      // Hapus produk dummy
      await sequelize.query(`DELETE FROM products WHERE id IN (${prodListStr});`, { transaction: t });
      console.log(`✓ ${products.length} Menu Produk dummy dihapus.`);
    }

    // 6. Hapus Bahan Baku dummy
    if (ingIds.length > 0) {
      const ingListStr = ingIds.join(',');
      await sequelize.query(`DELETE FROM ingredients WHERE id IN (${ingListStr});`, { transaction: t });
      console.log(`✓ ${ingredients.length} Bahan Baku dummy dihapus.`);
    }

    // 7. Hapus Kategori dummy (hanya jika sudah tidak ada produk lain yang memakai kategori ini)
    for (const catName of dummyCategoryNames) {
      const [cats] = await sequelize.query(
        `SELECT id FROM categories WHERE name = '${catName}'`,
        { transaction: t }
      );
      if (cats.length > 0) {
        const catId = cats[0].id;
        const [remainingProducts] = await sequelize.query(
          `SELECT COUNT(*) as count FROM products WHERE category_id = ${catId}`,
          { transaction: t }
        );
        if (remainingProducts[0].count === 0) {
          await sequelize.query(`DELETE FROM categories WHERE id = ${catId}`, { transaction: t });
        }
      }
    }
    console.log(`✓ Kategori dummy dibersihkan.`);

    // 8. Hidupkan kembali foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;', { transaction: t });

    await t.commit();

    console.log('\n====================================================');
    console.log('🎉 PEMBERSIHAN DATA DUMMY SELESAI!');
    console.log('====================================================');
    console.log('Akun login, outlet, dan hak akses tetap aman.');
    console.log('Aplikasi Anda kini siap untuk diisi produk & bahan riil.');
    console.log('====================================================\n');
  } catch (error) {
    await t.rollback();
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1;');
    console.error('❌ Gagal membersihkan data dummy:', error);
    throw error;
  }
}

// Eksekusi jika dipanggil dari CLI
if (require.main === module) {
  cleanDummyData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = cleanDummyData;
