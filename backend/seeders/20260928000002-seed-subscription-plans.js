'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const plans = [
      {
        id: 1,
        name: 'Uji Coba Gratis (1 Bulan)',
        code: 'FREE_TRIAL',
        description: 'Masa uji coba gratis 1 bulan untuk UMKM baru: Akses penuh ke seluruh fitur tanpa batasan.',
        price: 0.00,
        duration_days: 30,
        max_users: -1,
        max_outlets: -1,
        max_products: -1,
        max_transactions: -1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: 2,
        name: 'Langganan (1 Bulan)',
        code: 'SUBSCRIPTION',
        description: 'Langganan bulanan Rp 30.000/bln: Akses penuh ke seluruh fitur (cabang, staf, menu, & transaksi tanpa batas).',
        price: 30000.00,
        duration_days: 30,
        max_users: -1,
        max_outlets: -1,
        max_products: -1,
        max_transactions: -1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ];

    await queryInterface.bulkInsert('subscription_plans', plans, {
      updateOnDuplicate: ['name', 'description', 'price', 'duration_days', 'max_users', 'max_outlets', 'max_products', 'max_transactions', 'is_active']
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('subscription_plans', null, {});
  }
};
