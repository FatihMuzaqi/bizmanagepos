const app = require('../app');
const { testConnection, sequelize } = require('../config/database');
const { Subscription, SubscriptionPlan, BusinessUser, Outlet, Product, Transaction, Role, Permission } = require('../models');

const runSubscriptionTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 9 — SAAS SUBSCRIPTION INTEGRATION TESTS');
  console.log('====================================================\n');

  await testConnection();

  const TEST_PORT = 5080;
  let server;
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      resolve();
    });
  });
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api/v1`;

  try {
    const timestamp = Date.now();

    // ==============================================================
    // TEST 1: REGISTRATION AUTOMATICALLY PROVISIONS TRIAL SUBSCRIPTION
    // ==============================================================
    console.log('[Test 1] Registering Business A Owner (Kopi Mantap SaaS)...');
    const ownerAEmail = `owner_sub_a_${timestamp}@example.com`;
    const regARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pak Rian',
        email: ownerAEmail,
        phone: `0811${timestamp.toString().slice(-8)}`,
        password: 'PasswordA123!',
        business_name: 'Kopi Mantap SaaS'
      })
    });
    const regAData = await regARes.json();
    const tokenA = regAData.data.tokens.access_token;
    const businessAId = regAData.data.business.id;
    const outlet1Id = regAData.data.outlet.id;
    console.log(`✅ Business A registered: ID ${businessAId}`);

    // Verify Subscription is created as TRIAL
    console.log('\n--- [TEST 2] Owner Views Subscription (GET /subscription) ---');
    const subRes = await fetch(`${BASE_URL}/subscription`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const subData = await subRes.json();
    console.log('Subscription Overview:', JSON.stringify(subData.data));

    if (
      subRes.status === 200 &&
      subData.data.subscription.status === 'TRIAL' &&
      subData.data.subscription.plan.code === 'FREE_TRIAL' &&
      subData.data.usage.users.current === 1 &&
      subData.data.usage.outlets.current === 1
    ) {
      console.log('✅ PASS: Business A automatically received 14-day Free Trial subscription');
    } else {
      throw new Error(`Test 2 Failed: Unexpected subscription data: ${JSON.stringify(subData)}`);
    }

    // ==============================================================
    // TEST 3: OUTLET LIMIT ENFORCEMENT
    // ==============================================================
    console.log('\n--- [TEST 3] Outlet Limit Enforcement (Free Trial max_outlets = 1) ---');
    // Business A currently has 1 outlet. Trying to create a second outlet must be rejected!
    const createOutletBreachRes = await fetch(`${BASE_URL}/outlets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Cabang Kedua Gagal',
        code: `OUT-FAIL-${timestamp.toString().slice(-4)}`
      })
    });
    const createOutletBreachData = await createOutletBreachRes.json();
    console.log('Create 2nd Outlet status:', createOutletBreachRes.status, 'Message:', createOutletBreachData.message);

    if (
      createOutletBreachRes.status === 403 &&
      createOutletBreachData.message.includes('Outlet limit reached')
    ) {
      console.log('✅ PASS: Outlet creation beyond plan limit blocked with 403 Forbidden');
    } else {
      throw new Error(`Test 3 Failed: Expected 403 Outlet limit reached, got ${createOutletBreachRes.status}`);
    }

    // ==============================================================
    // TEST 4: USER LIMIT ENFORCEMENT
    // ==============================================================
    console.log('\n--- [TEST 4] User Limit Enforcement (Free Trial max_users = 2) ---');
    // Add Member 1 (User 2 - Kasir Budi) -> allowed (current count reaches 2/2)
    const cashierRole = await Role.findOne({
      where: { business_id: businessAId, name: 'Cashier' }
    });

    const emailMember1 = `member1_${timestamp}@example.com`;
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Member Satu',
        email: emailMember1,
        phone: `0822${timestamp.toString().slice(-8)}`,
        password: 'PasswordMember1!',
        business_name: 'Member1 Personal'
      })
    });

    const addMember1Res = await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId.toString(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: emailMember1,
        role_id: cashierRole.id,
        outlet_ids: [outlet1Id]
      })
    });
    console.log('Add Member 1 (2nd user) status:', addMember1Res.status);

    // Try to Add Member 2 (User 3) -> must be rejected because max_users = 2!
    const emailMember2 = `member2_${timestamp}@example.com`;
    await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Member Dua',
        email: emailMember2,
        phone: `0833${timestamp.toString().slice(-8)}`,
        password: 'PasswordMember2!',
        business_name: 'Member2 Personal'
      })
    });

    const addMember2Res = await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId.toString(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: emailMember2,
        role_id: cashierRole.id,
        outlet_ids: [outlet1Id]
      })
    });
    const addMember2Data = await addMember2Res.json();
    console.log('Add Member 2 (3rd user) status:', addMember2Res.status, 'Message:', addMember2Data.message);

    if (
      addMember2Res.status === 403 &&
      addMember2Data.message.includes('User limit reached')
    ) {
      console.log('✅ PASS: User creation beyond plan limit blocked with 403 Forbidden');
    } else {
      throw new Error(`Test 4 Failed: Expected 403 User limit reached, got ${addMember2Res.status}`);
    }

    // ==============================================================
    // TEST 5: UPGRADE SUBSCRIPTION UNLOCKS QUOTAS
    // ==============================================================
    console.log('\n--- [TEST 5] Upgrading Plan to Starter (max_outlets = 2, max_users = 5) ---');
    const plansRes = await fetch(`${BASE_URL}/subscription/plans`);
    const plansData = await plansRes.json();
    const starterPlan = plansData.data.find(p => p.code === 'STARTER');

    const upgradeRes = await fetch(`${BASE_URL}/subscription/upgrade`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        plan_id: starterPlan.id
      })
    });
    const upgradeData = await upgradeRes.json();
    console.log('Upgrade status:', upgradeRes.status, 'New Plan:', upgradeData.data.subscription.plan.name);

    if (
      upgradeRes.status === 200 &&
      upgradeData.data.subscription.plan.code === 'STARTER' &&
      upgradeData.data.subscription.status === 'ACTIVE'
    ) {
      console.log('✅ PASS: Subscription upgraded successfully to Starter Plan');
    } else {
      throw new Error(`Test 5 Failed: Upgrade failed: ${JSON.stringify(upgradeData)}`);
    }

    // Verify Outlet 2 and User 3 can now be created successfully under the upgraded plan!
    const createOutlet2Res = await fetch(`${BASE_URL}/outlets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Outlet Kedua Sukses',
        code: `OUT-OK-${timestamp.toString().slice(-4)}`
      })
    });
    console.log('Create 2nd Outlet after upgrade status:', createOutlet2Res.status);

    const addMember2AfterUpgradeRes = await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId.toString(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: emailMember2,
        role_id: cashierRole.id,
        outlet_ids: [outlet1Id]
      })
    });
    console.log('Add 3rd Member after upgrade status:', addMember2AfterUpgradeRes.status);

    if (createOutlet2Res.status === 201 && addMember2AfterUpgradeRes.status === 201) {
      console.log('✅ PASS: Upgraded plan successfully unlocked additional outlet and user capacity');
    } else {
      throw new Error('Test 5 Failed: Failed to create resources after upgrade');
    }

    // ==============================================================
    // TEST 6: SUBSCRIPTION EXPIRATION DETECTION
    // ==============================================================
    console.log('\n--- [TEST 6] Subscription Expiration Detection ---');
    // Artificially expire Business A's subscription in DB
    const subRecord = await Subscription.findOne({
      where: { business_id: businessAId },
      order: [['created_at', 'DESC']]
    });
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await subRecord.update({ ends_at: pastDate });

    // Try to create a product on expired subscription -> must be rejected with 403 SUBSCRIPTION_EXPIRED
    const createProdExpiredRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Produk Saat Expired',
        selling_price: 10000
      })
    });
    const createProdExpiredData = await createProdExpiredRes.json();
    console.log('Create Product with Expired Sub status:', createProdExpiredRes.status, 'Message:', createProdExpiredData.message);

    if (
      createProdExpiredRes.status === 403 &&
      createProdExpiredData.message.includes('expired')
    ) {
      console.log('✅ PASS: Expired subscription properly blocks resource mutations (403 Forbidden)');
    } else {
      throw new Error(`Test 6 Failed: Expected 403 Expired, got ${createProdExpiredRes.status}`);
    }

    // Re-activate subscription to test tenant isolation
    const proPlan = plansData.data.find(p => p.code === 'PRO');
    await subRecord.update({
      plan_id: proPlan.id,
      status: 'ACTIVE',
      ends_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    // ==============================================================
    // TEST 7: MULTI-TENANT ISOLATION
    // ==============================================================
    console.log('\n--- [TEST 7] Multi-Tenant Isolation ---');
    const ownerBEmail = `owner_sub_b_${timestamp}@example.com`;
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pak Doni',
        email: ownerBEmail,
        phone: `0844${timestamp.toString().slice(-8)}`,
        password: 'PasswordB123!',
        business_name: 'Bisnis B Mandiri'
      })
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.data.tokens.access_token;
    const businessBId = regBData.data.business.id;

    const subBRes = await fetch(`${BASE_URL}/subscription`, {
      headers: { 'Authorization': `Bearer ${tokenB}`, 'x-business-id': businessBId }
    });
    const subBData = await subBRes.json();
    console.log('Business B Subscription Plan:', subBData.data.subscription.plan.name);

    if (subBData.data.subscription.plan.code === 'FREE_TRIAL' && subRecord.plan_id !== subBData.data.subscription.plan.id) {
      console.log('✅ PASS: Business B has separate, independent subscription context');
    } else {
      throw new Error('Test 7 Failed: Multi-tenant subscription leak');
    }

    // ==============================================================
    // TEST 8: PERMISSION ENFORCEMENT (subscription.manage)
    // ==============================================================
    console.log('\n--- [TEST 8] Permission Enforcement (subscription.manage) ---');
    // Login Member 1 (Cashier in Business A -> has NO subscription.manage)
    const loginMember1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailMember1, password: 'PasswordMember1!' })
    });
    const loginMember1Data = await loginMember1Res.json();
    const tokenMember1 = loginMember1Data.data.tokens.access_token;

    const memberUpgradeRes = await fetch(`${BASE_URL}/subscription/upgrade`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenMember1}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ plan_id: starterPlan.id })
    });
    console.log('Cashier upgrade status:', memberUpgradeRes.status);

    if (memberUpgradeRes.status === 403) {
      console.log('✅ PASS: Staff without subscription.manage permission blocked from upgrading (403 Forbidden)');
    } else {
      throw new Error(`Test 8 Failed: Expected 403, got ${memberUpgradeRes.status}`);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 9 INTEGRATION TESTS PASSED (100% GREEN)');
    console.log('====================================================\n');

  } finally {
    server.close();
  }
};

if (require.main === module) {
  runSubscriptionTests().catch(err => {
    console.error('❌ Integration Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = runSubscriptionTests;
