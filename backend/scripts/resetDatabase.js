/**
 * ============================================================================
 * BIZMANAGE DATABASE CLEAN & RESET SCRIPT (scripts/resetDatabase.js)
 * ============================================================================
 * Membersihkan seluruh data transaksi, produk, inventori, cabang, user, dan tenant
 * untuk keperluan pengujian manual dari awal (fresh install).
 * 
 * Master data yang DIPERTAHANKAN:
 * 1. `permissions` (54 master permissions untuk sistem RBAC)
 * 2. `subscription_plans` (Uji Coba Gratis & Langganan Rp 30.000)
 * 3. `sequelizemeta` (Histori migrasi database)
 * ============================================================================
 */
'use strict';
require('dotenv').config();
const { sequelize } = require('../config/database');
const { Permission, SubscriptionPlan } = require('../models');

// Tabel tenant yang harus dibersihkan (diurutkan logis)
const TABLES_TO_TRUNCATE = [
  'audit_logs',
  'payments',
  'transaction_item_modifiers',
  'transaction_items',
  'transactions',
  'expenses',
  'expense_categories',
  'stock_movements',
  'recipe_items',
  'recipes',
  'ingredients',
  'units',
  'product_modifiers',
  'modifier_options',
  'modifiers',
  'product_variants',
  'products',
  'categories',
  'subscriptions',
  'user_roles',
  'role_permissions',
  'roles',
  'user_outlets',
  'outlets',
  'business_users',
  'businesses',
  'users'
];

async function resetDatabase() {
  console.log('====================================================');
  console.log('🧹 BIZMANAGE DATABASE RESET & CLEANUP');
  console.log('====================================================');
  console.log(`Target Database: ${sequelize.config.database} on ${sequelize.config.host}:${sequelize.config.port || 3306}`);
  console.log(`Waktu Eksekusi : ${new Date().toLocaleString('id-ID')}\n`);

  try {
    // 1. Nonaktifkan foreign key checks sementara
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('🔓 [1/4] Foreign key checks dinonaktifkan sementara.');

    // 2. Truncate setiap tabel tenant
    console.log('🗑️  [2/4] Membersihkan seluruh data tabel tenant...');
    for (const table of TABLES_TO_TRUNCATE) {
      try {
        await sequelize.query(`TRUNCATE TABLE \`${table}\``);
        process.stdout.write(`   ✓ Bersihkan tabel: ${table}\n`);
      } catch (err) {
        console.warn(`   ⚠️ Gagal truncate ${table}, mencoba DELETE...: ${err.message}`);
        await sequelize.query(`DELETE FROM \`${table}\``);
        await sequelize.query(`ALTER TABLE \`${table}\` AUTO_INCREMENT = 1`);
      }
    }

    // 3. Aktifkan kembali foreign key checks
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('🔒 [3/4] Foreign key checks diaktifkan kembali.');

    // 4. Verifikasi & Pastikan Master Subscription Plans tetap valid
    console.log('💎 [4/4] Memverifikasi integritas master data...');
    
    // Pastikan Plan 1 (FREE_TRIAL) dan Plan 2 (SUBSCRIPTION) siap dipakai
    await SubscriptionPlan.upsert({
      id: 1,
      name: 'Uji Coba Gratis (1 Bulan)',
      code: 'FREE_TRIAL',
      description: 'Masa uji coba gratis 1 bulan untuk UMKM baru: Akses penuh ke seluruh fitur tanpa batasan.',
      price: 0.00,
      duration_days: 30,
      max_outlets: -1,
      max_users: -1,
      max_products: -1,
      max_transactions: -1,
      is_active: true
    });

    await SubscriptionPlan.upsert({
      id: 2,
      name: 'Langganan (1 Bulan)',
      code: 'SUBSCRIPTION',
      description: 'Langganan bulanan Rp 30.000/bln: Akses penuh ke seluruh fitur (cabang, staf, menu, & transaksi tanpa batas).',
      price: 30000.00,
      duration_days: 30,
      max_outlets: -1,
      max_users: -1,
      max_products: -1,
      max_transactions: -1,
      is_active: true
    });

    // Nonaktifkan plan legacy jika ada
    await SubscriptionPlan.update({ is_active: false }, { where: { id: [3, 4] } });

    const permCount = await Permission.count();
    const planCount = await SubscriptionPlan.count({ where: { is_active: true } });

    console.log('\n====================================================');
    console.log('✅ DATABASE BERHASIL DIBERSIHKAN (SIAP UNTUK TESTING)');
    console.log('====================================================');
    console.log(`• Master Permissions Aktif       : ${permCount} izin`);
    console.log(`• Master Subscription Plans Aktif: ${planCount} paket (Uji Coba & Langganan Rp 30.000)`);
    console.log(`• Total Pengguna (Users)         : 0 akun`);
    console.log(`• Total Bisnis (Businesses)      : 0 bisnis`);
    console.log(`• Total Cabang (Outlets)         : 0 cabang`);
    console.log(`• Total Transaksi Kasir          : 0 transaksi`);
    console.log('====================================================\n');
    console.log('👉 Sekarang Anda dapat mulai mendaftar dari Owner pertama di aplikasi!');

  } catch (error) {
    console.error('❌ Gagal melakukan reset database:', error);
    try {
      await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (_) {}
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

resetDatabase();
