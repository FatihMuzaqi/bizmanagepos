const app = require('../app');
const env = require('../config/env');
const { testConnection, sequelize } = require('../config/database');

const runFoundationTests = async () => {
  console.log('--- STARTING FOUNDATION INTEGRATION TESTS ---');

  // 1. Database Connection Test
  console.log('\n[1] Testing Database Connection...');
  await testConnection();
  console.log('✅ Database connection test PASSED');

  // 2. Start Test Server on dedicated port
  const TEST_PORT = 5055;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
  console.log(`\n[2] Test server started at ${BASE_URL}`);

  try {
    // 3. Health Check Test
    console.log('\n[3] Testing GET /api/v1/health...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    console.log('Status:', healthRes.status, 'Response:', healthData);
    if (healthRes.status !== 200 || (healthData.status !== 'ok' && !healthData.success)) throw new Error('Health check failed');
    console.log('✅ Health Check test PASSED');

    // 4. Register Test
    const testEmail = `owner_${Date.now()}@example.com`;
    const testPhone = `0812${Date.now().toString().slice(-8)}`;
    console.log(`\n[4] Testing POST /api/v1/auth/register with email: ${testEmail}...`);
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Budi Santoso',
        email: testEmail,
        phone: testPhone,
        password: 'Password123!',
        business_name: 'Es Teh Nusantara',
        outlet_name: 'Outlet Tegal Pusat'
      })
    });
    const registerData = await registerRes.json();
    console.log('Status:', registerRes.status, 'Response:', JSON.stringify(registerData, null, 2));
    if (registerRes.status !== 201 || !registerData.success) throw new Error('Register failed: ' + JSON.stringify(registerData));
    console.log('✅ Registration test PASSED');

    const businessId = registerData.data.business.id;
    const initialAccessToken = registerData.data.tokens.access_token;
    const initialRefreshToken = registerData.data.tokens.refresh_token;

    // Upgrade plan to Enterprise to allow multi-branch creation in test suite
    const { Subscription } = require('../models');
    await Subscription.update({ plan_id: 4 }, { where: { business_id: businessId } });

    // 5. Duplicate Register Test (Should return 409 Conflict)
    console.log('\n[5] Testing Duplicate Registration Prevention (409 Conflict)...');
    const dupRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Budi Duplicate',
        email: testEmail,
        password: 'Password123!',
        business_name: 'Es Teh Duplicate'
      })
    });
    const dupData = await dupRes.json();
    console.log('Status:', dupRes.status, 'Response:', dupData);
    if (dupRes.status !== 409) throw new Error('Duplicate prevention failed: Expected 409');
    console.log('✅ Duplicate Prevention test PASSED');

    // 6. Login Test
    console.log('\n[6] Testing POST /api/v1/auth/login...');
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!'
      })
    });
    const loginData = await loginRes.json();
    console.log('Status:', loginRes.status, 'Response:', JSON.stringify(loginData, null, 2));
    if (loginRes.status !== 200 || !loginData.success) throw new Error('Login failed');
    console.log('✅ Login test PASSED');

    const accessToken = loginData.data.tokens.access_token;
    const refreshToken = loginData.data.tokens.refresh_token;

    // 7. Get Profile Test (Protected GET /api/v1/auth/me)
    console.log('\n[7] Testing GET /api/v1/auth/me (Protected Route with JWT)...');
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });
    const meData = await meRes.json();
    console.log('Status:', meRes.status, 'Response:', JSON.stringify(meData, null, 2));
    if (meRes.status !== 200 || !meData.success) throw new Error('Get profile failed');
    console.log('✅ Get Profile test PASSED');

    // 8. Refresh Token Test (POST /api/v1/auth/refresh-token)
    console.log('\n[8] Testing POST /api/v1/auth/refresh-token (Token Rotation)...');
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken })
    });
    const refreshData = await refreshRes.json();
    console.log('Status:', refreshData.status, 'Response:', JSON.stringify(refreshData, null, 2));
    if (refreshRes.status !== 200 || !refreshData.success) throw new Error('Refresh token failed');
    console.log('✅ Token Refresh test PASSED');

    const newAccessToken = refreshData.data.access_token;

    // 9. Multi-Tenant Context & Outlets Listing Test (GET /api/v1/businesses/outlets with X-Business-Id)
    console.log('\n[9] Testing Multi-Tenant Protected GET /api/v1/businesses/outlets with X-Business-Id header...');
    const outletsRes = await fetch(`${BASE_URL}/businesses/outlets`, {
      headers: {
        'Authorization': `Bearer ${newAccessToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    const outletsData = await outletsRes.json();
    console.log('Status:', outletsRes.status, 'Response:', JSON.stringify(outletsData, null, 2));
    if (outletsRes.status !== 200 || !outletsData.success) throw new Error('Get outlets failed');
    console.log('✅ Multi-Tenant Outlets Listing test PASSED');

    // 10. Create New Outlet Test (POST /api/v1/businesses/outlets)
    console.log('\n[10] Testing POST /api/v1/businesses/outlets (Create Second Branch)...');
    const createOutletRes = await fetch(`${BASE_URL}/businesses/outlets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${newAccessToken}`,
        'X-Business-Id': businessId.toString()
      },
      body: JSON.stringify({
        name: 'Outlet Slawi Square',
        code: 'OUT-02',
        address: 'Jl. Raya Slawi No. 45',
        phone: '081299887766'
      })
    });
    const createOutletData = await createOutletRes.json();
    console.log('Status:', createOutletRes.status, 'Response:', JSON.stringify(createOutletData, null, 2));
    if (createOutletRes.status !== 201 || !createOutletData.success) throw new Error('Create outlet failed');
    console.log('✅ Create Outlet test PASSED');

    // 11. Cross-Tenant Access Violation Test (Verify that another non-member business ID is blocked with 403)
    console.log('\n[11] Testing Cross-Tenant Isolation Security (Fake X-Business-Id: 99999)...');
    const tenantViolationRes = await fetch(`${BASE_URL}/businesses/outlets`, {
      headers: {
        'Authorization': `Bearer ${newAccessToken}`,
        'X-Business-Id': '99999'
      }
    });
    const tenantViolationData = await tenantViolationRes.json();
    console.log('Status:', tenantViolationRes.status, 'Response:', tenantViolationData);
    if (tenantViolationRes.status !== 403) throw new Error('Security violation: Cross-tenant request was not blocked with 403');
    console.log('✅ Cross-Tenant Isolation Security test PASSED (403 Forbidden received)');

    // 12. Logout Test (POST /api/v1/auth/logout)
    console.log('\n[12] Testing POST /api/v1/auth/logout...');
    const logoutRes = await fetch(`${BASE_URL}/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${newAccessToken}`
      }
    });
    const logoutData = await logoutRes.json();
    console.log('Status:', logoutRes.status, 'Response:', logoutData);
    if (logoutRes.status !== 200 || !logoutData.success) throw new Error('Logout failed');
    console.log('✅ Logout test PASSED');

    console.log('\n====================================================');
    console.log('🎉 ALL 12 FOUNDATION INTEGRATION TESTS PASSED 100%!');
    console.log('====================================================\n');

  } finally {
    server.close();
    await sequelize.close();
  }
};

runFoundationTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
