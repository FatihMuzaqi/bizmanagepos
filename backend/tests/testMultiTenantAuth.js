const app = require('../app');
const { testConnection, sequelize } = require('../config/database');

const runMultiTenantAuthTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING AUTHENTICATION + BUSINESS + MULTI-TENANT TESTS');
  console.log('====================================================\n');

  // 1. Database Connection
  await testConnection();

  // 2. Start Test Server on dedicated port
  const TEST_PORT = 5056;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

  try {
    const timestamp = Date.now();

    // ==========================================
    // STEP 1: REGISTER USER A (OWNER OF BUSINESS A)
    // ==========================================
    console.log('[Step 1] Registering User A (Owner of Es Teh Solo)...');
    const userAEmail = `user_a_${timestamp}@example.com`;
    const userAPassword = 'PasswordA123!';
    const regARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User A Owner',
        email: userAEmail,
        phone: `0811${timestamp.toString().slice(-8)}`,
        password: userAPassword,
        business_name: 'Es Teh Solo Makmur',
        outlet_name: 'Outlet Solo Pusat'
      })
    });
    const regAData = await regARes.json();
    if (regARes.status !== 201 || !regAData.success) {
      throw new Error(`User A Registration failed: ${JSON.stringify(regAData)}`);
    }

    const tokenA = regAData.data.tokens.access_token;
    const businessAId = regAData.data.business.id;
    const outletA1Id = regAData.data.outlet.id;
    console.log(`✅ User A registered successfully. Business A ID: ${businessAId}, Outlet A1 ID: ${outletA1Id}`);

    // ==========================================
    // STEP 2: REGISTER USER B (OWNER OF BUSINESS B)
    // ==========================================
    console.log('\n[Step 2] Registering User B (Owner of Kebab Juragan)...');
    const userBEmail = `user_b_${timestamp}@example.com`;
    const userBPassword = 'PasswordB123!';
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'User B Owner',
        email: userBEmail,
        phone: `0822${timestamp.toString().slice(-8)}`,
        password: userBPassword,
        business_name: 'Kebab Juragan Super',
        outlet_name: 'Outlet Kebab Tegal'
      })
    });
    const regBData = await regBRes.json();
    if (regBRes.status !== 201 || !regBData.success) {
      throw new Error(`User B Registration failed: ${JSON.stringify(regBData)}`);
    }

    const tokenB = regBData.data.tokens.access_token;
    const businessBId = regBData.data.business.id;
    const outletB1Id = regBData.data.outlet.id;
    console.log(`✅ User B registered successfully. Business B ID: ${businessBId}, Outlet B1 ID: ${outletB1Id}`);

    // ==========================================
    // STEP 3: CROSS-TENANT ISOLATION SECURITY TEST
    // ==========================================
    console.log('\n[Step 3] 🔒 Verifying Cross-Tenant Isolation: User A attempts to access Business B data...');
    const leakAttempt1 = await fetch(`${BASE_URL}/businesses/outlets`, {
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessBId.toString()
      }
    });
    const leakData1 = await leakAttempt1.json();
    console.log(`User A -> Business B response status: ${leakAttempt1.status} (Expected: 403)`);
    if (leakAttempt1.status !== 403 || leakData1.error_code !== 'TENANT_ACCESS_DENIED') {
      throw new Error(`CRITICAL SECURITY FAILURE: User A was able to access Business B or returned wrong status: ${JSON.stringify(leakData1)}`);
    }
    console.log('✅ PASS: User A was blocked with 403 Forbidden from accessing Business B');

    console.log('\n[Step 3.2] 🔒 Verifying Cross-Tenant Isolation: User B attempts to access Business A data...');
    const leakAttempt2 = await fetch(`${BASE_URL}/businesses/profile`, {
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    const leakData2 = await leakAttempt2.json();
    console.log(`User B -> Business A response status: ${leakAttempt2.status} (Expected: 403)`);
    if (leakAttempt2.status !== 403 || leakData2.error_code !== 'TENANT_ACCESS_DENIED') {
      throw new Error(`CRITICAL SECURITY FAILURE: User B was able to access Business A or returned wrong status: ${JSON.stringify(leakData2)}`);
    }
    console.log('✅ PASS: User B was blocked with 403 Forbidden from accessing Business A');

    // ==========================================
    // STEP 4: UPDATE PROFILE & VERIFY
    // ==========================================
    console.log('\n[Step 4] Testing User Profile Update (PUT /api/v1/auth/profile)...');
    const updatedName = 'Budi Santoso Owner Updated';
    const updateProfRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: updatedName,
        phone: `0819${timestamp.toString().slice(-8)}`
      })
    });
    const updateProfData = await updateProfRes.json();
    if (updateProfRes.status !== 200 || updateProfData.data.name !== updatedName) {
      throw new Error(`Update Profile failed: ${JSON.stringify(updateProfData)}`);
    }

    // Verify GET /me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { 'Authorization': `Bearer ${tokenA}` }
    });
    const meData = await meRes.json();
    if (meData.data.user.name !== updatedName) {
      throw new Error('Profile update verification failed on GET /me');
    }
    console.log(`✅ Profile updated and verified successfully: "${meData.data.user.name}"`);

    // ==========================================
    // STEP 5: PASSWORD CHANGE & RE-LOGIN
    // ==========================================
    console.log('\n[Step 5] Testing Password Change (PUT /api/v1/auth/password)...');
    const newPasswordA = 'NewPasswordA999!';
    const changePassRes = await fetch(`${BASE_URL}/auth/password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        current_password: userAPassword,
        new_password: newPasswordA,
        new_password_confirmation: newPasswordA
      })
    });
    const changePassData = await changePassRes.json();
    if (changePassRes.status !== 200) {
      throw new Error(`Password change failed: ${JSON.stringify(changePassData)}`);
    }

    // Test Old Password (Should Fail)
    const oldLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: userAPassword })
    });
    if (oldLoginRes.status !== 401) {
      throw new Error('Security failure: Old password still works after change');
    }
    console.log('✅ Old password rejected with 401 Unauthorized');

    // Test New Password (Should Succeed)
    const newLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userAEmail, password: newPasswordA })
    });
    const newLoginData = await newLoginRes.json();
    if (newLoginRes.status !== 200) {
      throw new Error(`Login with new password failed: ${JSON.stringify(newLoginData)}`);
    }
    const freshTokenA = newLoginData.data.tokens.access_token;
    console.log('✅ New password login successful and received fresh Access Token');

    // ==========================================
    // STEP 6: BUSINESS CREATION & SELECTION
    // ==========================================
    console.log('\n[Step 6] Testing Multi-Business: User A creates a second business "Bakery Roti Manis"...');
    const createBiz2Res = await fetch(`${BASE_URL}/businesses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshTokenA}`
      },
      body: JSON.stringify({
        name: 'Bakery Roti Manis',
        legal_name: 'PT Roti Manis Sentosa',
        initial_outlet_name: 'Outlet Roti Slawi'
      })
    });
    const createBiz2Data = await createBiz2Res.json();
    if (createBiz2Res.status !== 201) {
      throw new Error(`Create second business failed: ${JSON.stringify(createBiz2Data)}`);
    }
    const businessA2Id = createBiz2Data.data.business.id;
    console.log(`✅ Second business created. ID: ${businessA2Id}, Name: "${createBiz2Data.data.business.name}"`);

    // Verify GET /businesses/my returns 2 businesses for User A
    const myBizRes = await fetch(`${BASE_URL}/businesses/my`, {
      headers: { 'Authorization': `Bearer ${freshTokenA}` }
    });
    const myBizData = await myBizRes.json();
    if (myBizData.data.length < 2) {
      throw new Error(`Expected at least 2 businesses for User A, got: ${myBizData.data.length}`);
    }
    console.log(`✅ User A now owns ${myBizData.data.length} businesses: ${myBizData.data.map(b => b.name).join(', ')}`);

    // Test Select Business Context
    console.log('\n[Step 6.2] Testing Business Selection (POST /api/v1/businesses/select)...');
    const selectRes = await fetch(`${BASE_URL}/businesses/select`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshTokenA}`
      },
      body: JSON.stringify({ business_id: businessA2Id })
    });
    const selectData = await selectRes.json();
    if (selectRes.status !== 200 || selectData.data.business.id !== businessA2Id) {
      throw new Error(`Business select context failed: ${JSON.stringify(selectData)}`);
    }
    console.log(`✅ Active business switched to: "${selectData.data.business.name}". Permissions: ${JSON.stringify(selectData.data.permissions)}`);

    // ==========================================
    // STEP 7: BUSINESS MEMBERSHIP & RBAC PERMISSION CHECKS
    // ==========================================
    console.log('\n[Step 7] Testing Business Membership: User A adds User B as Cashier to Business A...');
    
    // Fetch Cashier Role ID in Business A
    const { Role } = require('../models');
    const cashierRole = await Role.findOne({
      where: {
        business_id: businessAId,
        name: 'Cashier'
      }
    });
    if (!cashierRole) throw new Error('Default Cashier role not found in Business A');

    const addMemberRes = await fetch(`${BASE_URL}/businesses/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${freshTokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        email: userBEmail,
        role_id: cashierRole.id,
        outlet_ids: [outletA1Id]
      })
    });
    const addMemberData = await addMemberRes.json();
    if (addMemberRes.status !== 201) {
      throw new Error(`Add member failed: ${JSON.stringify(addMemberData)}`);
    }
    console.log(`✅ User B added as Cashier to Business A in outlet ID: ${outletA1Id}`);

    // Now User B accesses Business A as Cashier
    console.log('\n[Step 7.2] User B accesses Business A with Cashier Role (Authorized)...');
    const userBAccessBizARes = await fetch(`${BASE_URL}/businesses/outlets`, {
      headers: {
        'Authorization': `Bearer ${tokenB}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    const userBAccessBizAData = await userBAccessBizARes.json();
    if (userBAccessBizARes.status !== 200 || userBAccessBizAData.data.length !== 1) {
      throw new Error(`User B failed to view assigned outlet in Business A: ${JSON.stringify(userBAccessBizAData)}`);
    }
    console.log(`✅ User B can view assigned outlet "${userBAccessBizAData.data[0].name}" in Business A`);

    // Verify Granular RBAC Restriction: Cashier cannot update Business Profile
    console.log('\n[Step 7.3] 🔒 Verifying RBAC Restriction: User B (Cashier) attempts to update Business A profile...');
    const forbiddenActionRes = await fetch(`${BASE_URL}/businesses/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({ name: 'Hacked Business Name' })
    });
    const forbiddenActionData = await forbiddenActionRes.json();
    console.log(`User B profile update status: ${forbiddenActionRes.status} (Expected: 403)`);
    if (forbiddenActionRes.status !== 403 || forbiddenActionData.error_code !== 'INSUFFICIENT_PERMISSIONS') {
      throw new Error(`RBAC FAILURE: Cashier was able to update business profile or returned wrong code: ${JSON.stringify(forbiddenActionData)}`);
    }
    console.log('✅ PASS: User B blocked with 403 Forbidden (INSUFFICIENT_PERMISSIONS) from updating Business Profile');

    console.log('\n====================================================');
    console.log('🎉 ALL AUTHENTICATION, BUSINESS & MULTI-TENANT TESTS PASSED 100%!');
    console.log('====================================================\n');

  } finally {
    server.close();
    await sequelize.close();
  }
};

runMultiTenantAuthTests().catch(err => {
  console.error('\n❌ MULTI-TENANT TEST FAILED:', err);
  process.exit(1);
});
