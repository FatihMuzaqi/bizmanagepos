'use strict';
const { User, Business, BusinessUser, Outlet, UserOutlet, Role, Subscription, sequelize } = require('../models');
const { hashPassword } = require('../utils/password');
const { initializeDefaultRolesForBusiness } = require('../services/rbacService');

async function seedDemoAccount() {
  console.log('====================================================');
  console.log('🌱 SEEDING DEMO OWNER ACCOUNT');
  console.log('====================================================\n');

  const email = 'demo.owner@bizmanage.local';
  const phone = '089999999999';
  const rawPassword = 'DemoPassword123!';

  // Check if demo user already exists by email or phone
  const existingUser = await User.findOne({
    where: {
      [sequelize.Sequelize.Op.or]: [{ email }, { phone }]
    }
  });
  if (existingUser) {
    console.log('ℹ️ Demo user already exists. Updating password...');
    const hashedPassword = await hashPassword(rawPassword);
    await existingUser.update({ password: hashedPassword, is_active: true });
    console.log('✅ Demo account password refreshed successfully.');
    console.log('\n====================================================');
    console.log('Credentials:');
    console.log(`Email / No HP : ${email}  (atau ${phone})`);
    console.log(`Password      : ${rawPassword}`);
    console.log('====================================================');
    return;
  }

  const transaction = await sequelize.transaction();

  try {
    const hashedPassword = await hashPassword(rawPassword);

    // 1. Create User
    const user = await User.create({
      name: 'Demo Owner (Es Teh Nusantara)',
      email,
      phone,
      password: hashedPassword,
      is_active: true
    }, { transaction });

    // 2. Create Business
    const business = await Business.create({
      owner_id: user.id,
      name: 'Es Teh & Kopi Nusantara Demo',
      legal_name: 'PT Nusantara F&B Demo',
      is_active: true
    }, { transaction });

    // 3. Link Owner to Business
    await BusinessUser.create({
      business_id: business.id,
      user_id: user.id,
      is_owner: true,
      is_active: true
    }, { transaction });

    // 4. Initialize Default RBAC Roles (Admin, Cashier)
    await initializeDefaultRolesForBusiness(business.id, transaction);

    // 6. Create Main Outlet
    const outlet = await Outlet.create({
      business_id: business.id,
      name: 'Outlet Pusat Tegal',
      code: 'OUT-TGL-01',
      address: 'Jl. Ahmad Yani No. 10, Tegal',
      phone: '089999999999',
      is_active: true
    }, { transaction });

    // 7. Link User to Outlet
    await UserOutlet.create({
      user_id: user.id,
      outlet_id: outlet.id
    }, { transaction });

    // 8. Create 14-Day Free Trial Subscription
    const now = new Date();
    await Subscription.create({
      business_id: business.id,
      plan_id: 1, // Free Trial Plan
      status: 'TRIAL',
      starts_at: now,
      trial_ends_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      ends_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000)
    }, { transaction });

    await transaction.commit();

    console.log('✅ Demo Owner Account successfully created!');
    console.log('\n====================================================');
    console.log('🎉 AKUN SIAP DIGUNAKAN UNTUK LOGIN:');
    console.log(`Email / No HP : ${email}  (atau ${phone})`);
    console.log(`Password      : ${rawPassword}`);
    console.log(`Nama Bisnis   : ${business.name}`);
    console.log(`Outlet Aktif  : ${outlet.name}`);
    console.log('====================================================');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Failed to seed demo account:', error);
    throw error;
  }
}

if (require.main === module) {
  seedDemoAccount()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedDemoAccount;
