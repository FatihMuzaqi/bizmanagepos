'use strict';
const bcrypt = require('bcryptjs');

/**
 * Development Demo Data Seeder
 * FOR DEVELOPMENT AND LOCAL TESTING ONLY!
 * NEVER RUN THIS SEEDER IN PRODUCTION ENVIRONMENTS.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('⚠️ [SAFETY] Refusing to seed demo accounts in NODE_ENV=production!');
      return;
    }

    const hashedPassword = await bcrypt.hash('DemoPassword123!', 10);
    const now = new Date();

    // 1. Create Demo Owner User
    const [userId] = await queryInterface.bulkInsert('users', [{
      name: 'Demo Owner (Es Teh Nusantara)',
      email: 'demo.owner@bizmanage.local',
      phone: '081234567890',
      password: hashedPassword,
      is_active: true,
      created_at: now,
      updated_at: now
    }]);

    // 2. Create Demo Business
    const [businessId] = await queryInterface.bulkInsert('businesses', [{
      owner_id: userId,
      name: 'Es Teh & Kopi Nusantara Demo',
      legal_name: 'PT Nusantara F&B Demo',
      is_active: true,
      created_at: now,
      updated_at: now
    }]);

    // 3. Link Owner to Business
    const [businessUserId] = await queryInterface.bulkInsert('business_users', [{
      business_id: businessId,
      user_id: userId,
      is_owner: true,
      is_active: true,
      created_at: now,
      updated_at: now
    }]);

    // 4. Create Main Outlet
    const [outletId] = await queryInterface.bulkInsert('outlets', [{
      business_id: businessId,
      name: 'Outlet Pusat Tegal',
      code: 'OUT-TGL-01',
      address: 'Jl. Ahmad Yani No. 10, Tegal',
      phone: '0283-123456',
      is_active: true,
      created_at: now,
      updated_at: now
    }]);

    // 5. Link User to Outlet
    await queryInterface.bulkInsert('user_outlets', [{
      user_id: userId,
      outlet_id: outletId,
      created_at: now,
      updated_at: now
    }]);

    // 6. Free Trial Subscription
    await queryInterface.bulkInsert('subscriptions', [{
      business_id: businessId,
      plan_id: 1, // Free Trial
      status: 'TRIAL',
      starts_at: now,
      trial_ends_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      ends_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      created_at: now,
      updated_at: now
    }]);

    console.log('✅ [Dev Seeder] Demo Owner Account created: demo.owner@bizmanage.local / DemoPassword123!');
  },

  async down(queryInterface, Sequelize) {
    if (process.env.NODE_ENV === 'production') return;
    await queryInterface.bulkDelete('users', { email: 'demo.owner@bizmanage.local' }, {});
  }
};
