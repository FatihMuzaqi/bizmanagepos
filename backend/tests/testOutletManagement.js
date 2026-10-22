const app = require('../app');
const { testConnection, sequelize } = require('../config/database');

const runOutletManagementTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING BUSINESS + OUTLET + USER OUTLET ACCESS TESTS');
  console.log('====================================================\n');

  await testConnection();

  const TEST_PORT = 5057;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

  try {
    const timestamp = Date.now();

    // ==============================================================
    // STEP 1: REGISTER OWNER (BUSINESS A: "Kopi Kenangan Nusantara")
    // ==============================================================
    console.log('[Step 1] Registering Owner for Business A...');
    const ownerEmail = `owner_kopi_${timestamp}@example.com`;
    const regOwnerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pak Hendra (Owner)',
        email: ownerEmail,
        phone: `0811${timestamp.toString().slice(-8)}`,
        password: 'PasswordOwner123!',
        business_name: 'Kopi Kenangan Nusantara',
        outlet_name: 'Outlet Tegal'
      })
    });
    const regOwnerData = await regOwnerRes.json();
    if (regOwnerRes.status !== 201) throw new Error(`Owner register failed: ${JSON.stringify(regOwnerData)}`);

    const ownerToken = regOwnerData.data.tokens.access_token;
    const businessAId = regOwnerData.data.business.id;
    const outletTegalId = regOwnerData.data.outlet.id;
    console.log(`✅ Business A created: ID ${businessAId}. Initial Outlet Tegal: ID ${outletTegalId}`);

    // Upgrade plan to Enterprise to allow multi-outlet testing
    const { Subscription } = require('../models');
    await Subscription.update({ plan_id: 4 }, { where: { business_id: businessAId } });

    // ==============================================================
    // STEP 2: REGISTER EMPLOYEE "BUDI" & EMPLOYEE "SITI"
    // ==============================================================
    console.log('\n[Step 2] Registering Employees Budi & Siti...');
    const budiEmail = `budi_${timestamp}@example.com`;
    const regBudiRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Budi Kasir',
        email: budiEmail,
        phone: `0822${timestamp.toString().slice(-8)}`,
        password: 'PasswordBudi123!',
        business_name: 'Budi Personal Store'
      })
    });
    const regBudiData = await regBudiRes.json();
    const budiToken = regBudiData.data.tokens.access_token;
    const budiUserId = regBudiData.data.user.id;
    console.log(`✅ User Budi registered: ID ${budiUserId}`);

    const sitiEmail = `siti_${timestamp}@example.com`;
    const regSitiRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Siti Staff',
        email: sitiEmail,
        phone: `0833${timestamp.toString().slice(-8)}`,
        password: 'PasswordSiti123!',
        business_name: 'Siti Personal Store'
      })
    });
    const regSitiData = await regSitiRes.json();
    const sitiToken = regSitiData.data.tokens.access_token;
    const sitiUserId = regSitiData.data.user.id;
    console.log(`✅ User Siti registered: ID ${sitiUserId}`);

    // ==============================================================
    // STEP 3: BUSINESS MANAGEMENT (GET /business & PUT /business)
    // ==============================================================
    console.log('\n[Step 3] Testing Business Profile View & Update...');
    const getBizRes = await fetch(`${BASE_URL}/business`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    const getBizData = await getBizRes.json();
    if (getBizRes.status !== 200 || !getBizData.data.stats) throw new Error('Get Business failed');
    console.log(`✅ GET /business successful. Stats: Active Outlets: ${getBizData.data.stats.total_active_outlets}, Members: ${getBizData.data.stats.total_active_members}`);

    const updateBizRes = await fetch(`${BASE_URL}/business`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Kopi Kenangan Nusantara Prima',
        legal_name: 'PT Kopi Kenangan Nusantara Abadi'
      })
    });
    const updateBizData = await updateBizRes.json();
    if (updateBizRes.status !== 200 || updateBizData.data.name !== 'Kopi Kenangan Nusantara Prima') {
      throw new Error(`Update Business failed: ${JSON.stringify(updateBizData)}`);
    }
    console.log('✅ PUT /business updated name & legal_name successfully');

    // ==============================================================
    // STEP 4: OUTLET MANAGEMENT (CREATE, LIST, GET, UPDATE)
    // ==============================================================
    console.log('\n[Step 4] Creating Outlets: "Outlet Slawi" and "Outlet Brebes"...');
    
    // Create Outlet Slawi
    const createSlawiRes = await fetch(`${BASE_URL}/outlets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Outlet Slawi',
        code: 'SLW-01',
        address: 'Jl. Ahmad Yani No. 12, Slawi',
        phone: '081234567801'
      })
    });
    const createSlawiData = await createSlawiRes.json();
    const outletSlawiId = createSlawiData.data.id;
    console.log(`✅ Created Outlet Slawi: ID ${outletSlawiId}`);

    // Create Outlet Brebes
    const createBrebesRes = await fetch(`${BASE_URL}/outlets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Outlet Brebes',
        code: 'BBS-01',
        address: 'Jl. Jenderal Sudirman No. 88, Brebes',
        phone: '081234567802'
      })
    });
    const createBrebesData = await createBrebesRes.json();
    const outletBrebesId = createBrebesData.data.id;
    console.log(`✅ Created Outlet Brebes: ID ${outletBrebesId}`);

    // List Outlets as Owner (Should see all 3 outlets)
    const listOutletsRes = await fetch(`${BASE_URL}/outlets`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    const listOutletsData = await listOutletsRes.json();
    if (listOutletsData.data.length !== 3) {
      throw new Error(`Expected 3 outlets for Owner, got: ${listOutletsData.data.length}`);
    }
    console.log(`✅ Owner lists all 3 outlets: ${listOutletsData.data.map(o => o.name).join(', ')}`);

    // Update Outlet Brebes
    const updateBrebesRes = await fetch(`${BASE_URL}/outlets/${outletBrebesId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Outlet Brebes Timur Mega'
      })
    });
    const updateBrebesData = await updateBrebesRes.json();
    if (updateBrebesData.data.name !== 'Outlet Brebes Timur Mega') throw new Error('Update outlet failed');
    console.log(`✅ PUT /outlets/${outletBrebesId} updated outlet name to "${updateBrebesData.data.name}"`);

    // ==============================================================
    // STEP 5: ADD BUDI TO BUSINESS A (ASSIGN ONLY TEGAL & SLAWI)
    // ==============================================================
    console.log('\n[Step 5] Adding Budi to Business A as Cashier (Assigned to Tegal & Slawi only)...');
    
    const { Role } = require('../models');
    const cashierRole = await Role.findOne({
      where: { business_id: businessAId, name: 'Cashier' }
    });

    const addBudiRes = await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        email: budiEmail,
        role_id: cashierRole.id,
        outlet_ids: [outletTegalId, outletSlawiId]
      })
    });
    const addBudiData = await addBudiRes.json();
    if (addBudiRes.status !== 201) throw new Error(`Add Budi failed: ${JSON.stringify(addBudiData)}`);
    console.log('✅ Budi added to Business A with outlets: [Outlet Tegal, Outlet Slawi]');

    // ==============================================================
    // STEP 6: TEST BUDI'S SCOPED OUTLET ACCESS (WHERE DIMENSION)
    // ==============================================================
    console.log('\n[Step 6] 🔒 Testing Budi Outlet Scoping (WHERE Dimension)...');
    
    // Budi lists outlets in Business A
    const budiOutletsRes = await fetch(`${BASE_URL}/outlets`, {
      headers: {
        'Authorization': `Bearer ${budiToken}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    const budiOutletsData = await budiOutletsRes.json();
    console.log(`Budi can see ${budiOutletsData.data.length} outlets: ${budiOutletsData.data.map(o => o.name).join(', ')}`);
    if (budiOutletsData.data.length !== 2) {
      throw new Error(`Expected Budi to see 2 outlets, but saw: ${budiOutletsData.data.length}`);
    }
    console.log('✅ PASS: Budi sees exactly 2 assigned outlets (Tegal & Slawi)');

    // Budi requests Outlet Tegal (Allowed -> 200 OK)
    const budiTegalRes = await fetch(`${BASE_URL}/outlets/${outletTegalId}`, {
      headers: {
        'Authorization': `Bearer ${budiToken}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    if (budiTegalRes.status !== 200) throw new Error('Budi should have access to Outlet Tegal');
    console.log('✅ PASS: Budi accessed Outlet Tegal successfully (200 OK)');

    // Budi requests Outlet Brebes (Unauthorized Outlet -> Must return 403 Forbidden)
    const budiBrebesRes = await fetch(`${BASE_URL}/outlets/${outletBrebesId}`, {
      headers: {
        'Authorization': `Bearer ${budiToken}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    const budiBrebesData = await budiBrebesRes.json();
    console.log(`Budi -> Outlet Brebes status: ${budiBrebesRes.status} (Expected: 403)`);
    if (budiBrebesRes.status !== 403 || budiBrebesData.error_code !== 'OUTLET_ACCESS_DENIED') {
      throw new Error(`SECURITY BREACH: Budi was able to access Outlet Brebes! Response: ${JSON.stringify(budiBrebesData)}`);
    }
    console.log('✅ PASS: Budi was BLOCKED from Outlet Brebes (403 Forbidden - OUTLET_ACCESS_DENIED)');

    // ==============================================================
    // STEP 7: USER OUTLET ASSIGNMENT & REVOCATION APIS
    // ==============================================================
    console.log('\n[Step 7] Testing Dynamic User-Outlet Assignment APIs...');
    
    // Assign Budi to Outlet Brebes as well
    console.log('Owner grants Budi access to Outlet Brebes via POST /business/members/:userId/outlets...');
    const grantRes = await fetch(`${BASE_URL}/business/members/${budiUserId}/outlets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        outlet_ids: [outletBrebesId]
      })
    });
    if (grantRes.status !== 200) throw new Error('Grant outlet access failed');
    
    // Now Budi tests Outlet Brebes (Should be 200 OK now!)
    const budiBrebesNowRes = await fetch(`${BASE_URL}/outlets/${outletBrebesId}`, {
      headers: {
        'Authorization': `Bearer ${budiToken}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    if (budiBrebesNowRes.status !== 200) throw new Error('Budi should now be able to access Outlet Brebes');
    console.log('✅ PASS: Budi can now access Outlet Brebes after permission grant (200 OK)');

    // Revoke Budi access from Outlet Tegal
    console.log('Owner revokes Budi access from Outlet Tegal via DELETE /business/members/:userId/outlets/:outletId...');
    const revokeRes = await fetch(`${BASE_URL}/business/members/${budiUserId}/outlets/${outletTegalId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    if (revokeRes.status !== 200) throw new Error('Revoke outlet access failed');

    // Budi tests Outlet Tegal (Should be 403 Forbidden now!)
    const budiTegalRevokedRes = await fetch(`${BASE_URL}/outlets/${outletTegalId}`, {
      headers: {
        'Authorization': `Bearer ${budiToken}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    if (budiTegalRevokedRes.status !== 403) throw new Error('Budi should no longer have access to Outlet Tegal');
    console.log('✅ PASS: Budi was immediately blocked from Outlet Tegal after revocation (403 Forbidden)');

    // ==============================================================
    // STEP 8: PREVENT DELETING LAST REMAINING OUTLET
    // ==============================================================
    console.log('\n[Step 8] Testing Deletion Safeguards: Deactivate Outlet Slawi & Brebes...');
    await fetch(`${BASE_URL}/outlets/${outletSlawiId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'X-Business-Id': businessAId.toString() }
    });
    await fetch(`${BASE_URL}/outlets/${outletBrebesId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'X-Business-Id': businessAId.toString() }
    });

    console.log('Attempting to delete the last active outlet (Outlet Tegal)...');
    const deleteLastRes = await fetch(`${BASE_URL}/outlets/${outletTegalId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}`, 'X-Business-Id': businessAId.toString() }
    });
    const deleteLastData = await deleteLastRes.json();
    console.log(`Delete last outlet status: ${deleteLastRes.status} (Expected: 400)`);
    if (deleteLastRes.status !== 400 || deleteLastData.error_code !== 'CANNOT_DELETE_LAST_OUTLET') {
      throw new Error(`Safeguard failed: Last outlet was allowed to be deleted! Response: ${JSON.stringify(deleteLastData)}`);
    }
    console.log('✅ PASS: Server prevented deletion of the last remaining outlet (400 Bad Request - CANNOT_DELETE_LAST_OUTLET)');

    console.log('\n====================================================');
    console.log('🎉 ALL BUSINESS, OUTLET & USER-OUTLET TESTS PASSED 100%!');
    console.log('====================================================\n');

  } finally {
    server.close();
    await sequelize.close();
  }
};

runOutletManagementTests().catch(err => {
  console.error('\n❌ OUTLET MANAGEMENT TEST FAILED:', err);
  process.exit(1);
});
