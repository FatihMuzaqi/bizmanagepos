const app = require('../app');
const { testConnection, sequelize } = require('../config/database');

const runDynamicRBACTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING DYNAMIC RBAC & PERMISSION INTEGRATION TESTS');
  console.log('====================================================\n');

  await testConnection();

  const TEST_PORT = 5058;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

  try {
    const timestamp = Date.now();

    // ==============================================================
    // STEP 1: REGISTER OWNER (BUSINESS: "Kebab Turki Sultan")
    // ==============================================================
    console.log('[Step 1] Registering Business Owner...');
    const ownerEmail = `owner_kebab_${timestamp}@example.com`;
    const regOwnerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Sultan Agung (Owner)',
        email: ownerEmail,
        phone: `0811${timestamp.toString().slice(-8)}`,
        password: 'PasswordOwner123!',
        business_name: 'Kebab Turki Sultan',
        outlet_name: 'Outlet Tegal Plaza'
      })
    });
    const regOwnerData = await regOwnerRes.json();
    if (regOwnerRes.status !== 201) throw new Error(`Owner register failed: ${JSON.stringify(regOwnerData)}`);

    const ownerToken = regOwnerData.data.tokens.access_token;
    const businessId = regOwnerData.data.business.id;
    const outlet1Id = regOwnerData.data.outlet.id;
    console.log(`✅ Business created: ID ${businessId}, Primary Outlet ID: ${outlet1Id}`);

    // Upgrade plan to Enterprise to allow multi-outlet testing
    const { Subscription } = require('../models');
    await Subscription.update({ plan_id: 4 }, { where: { business_id: businessId } });

    // Create a second outlet (Outlet 2)
    const createOut2Res = await fetch(`${BASE_URL}/outlets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      },
      body: JSON.stringify({
        name: 'Outlet Slawi Square',
        code: 'SLW-01'
      })
    });
    const createOut2Data = await createOut2Res.json();
    const outlet2Id = createOut2Data.data.id;
    console.log(`✅ Second Outlet created: ID ${outlet2Id}`);

    // ==============================================================
    // STEP 2: REGISTER EMPLOYEES: "CASHIER_USER" & "SUPERVISOR_USER"
    // ==============================================================
    console.log('\n[Step 2] Registering Employees: Doni (Cashier) & Agus (Future Supervisor)...');
    const doniEmail = `doni_${timestamp}@example.com`;
    const regDoniRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Doni Kasir',
        email: doniEmail,
        phone: `0822${timestamp.toString().slice(-8)}`,
        password: 'PasswordDoni123!',
        business_name: 'Doni Personal Store'
      })
    });
    const regDoniData = await regDoniRes.json();
    const doniToken = regDoniData.data.tokens.access_token;
    const doniUserId = regDoniData.data.user.id;

    const agusEmail = `agus_${timestamp}@example.com`;
    const regAgusRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Agus Supervisor',
        email: agusEmail,
        phone: `0833${timestamp.toString().slice(-8)}`,
        password: 'PasswordAgus123!',
        business_name: 'Agus Personal Store'
      })
    });
    const regAgusData = await regAgusRes.json();
    const agusToken = regAgusData.data.tokens.access_token;
    const agusUserId = regAgusData.data.user.id;
    console.log(`✅ Employees registered: Doni (ID ${doniUserId}), Agus (ID ${agusUserId})`);

    // ==============================================================
    // STEP 3: MASTER PERMISSIONS & DEFAULT ROLES
    // ==============================================================
    console.log('\n[Step 3] Fetching Master Permissions Catalog & Default Roles...');
    const permsRes = await fetch(`${BASE_URL}/permissions`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    const permsData = await permsRes.json();
    if (permsRes.status !== 200 || !permsData.data.list) throw new Error('Fetch permissions failed');
    console.log(`✅ Master Permissions loaded: Total ${permsData.data.total} permissions across ${Object.keys(permsData.data.grouped).length} groups`);

    const rolesRes = await fetch(`${BASE_URL}/roles`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    const rolesData = await rolesRes.json();
    if (rolesRes.status !== 200 || rolesData.data.length < 2) throw new Error('Default roles not found');
    console.log(`✅ Default Roles found: ${rolesData.data.map(r => `${r.name} (${r.permissions_count} perms)`).join(', ')}`);

    const cashierRole = rolesData.data.find(r => r.name === 'Cashier');
    const adminRole = rolesData.data.find(r => r.name === 'Admin');

    // ==============================================================
    // STEP 4: OWNER FULL ACCESS & EFFECTIVE PERMISSIONS
    // ==============================================================
    console.log('\n[Step 4] Checking Owner Effective Permissions (Full Bypass)...');
    const ownerPermsRes = await fetch(`${BASE_URL}/my-permissions`, {
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    const ownerPermsData = await ownerPermsRes.json();
    if (ownerPermsRes.status !== 200 || !ownerPermsData.data.is_owner) {
      throw new Error(`Owner effective permissions check failed: ${JSON.stringify(ownerPermsData)}`);
    }
    console.log(`✅ Owner recognized as is_owner: true, has ${ownerPermsData.data.permissions.length} effective permissions`);

    // ==============================================================
    // STEP 5: CASHIER ACCESS (POS ONLY) & REJECTION TESTS
    // ==============================================================
    console.log('\n[Step 5] Assigning Doni as Cashier to Outlet 1 only...');
    const addDoniRes = await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      },
      body: JSON.stringify({
        email: doniEmail,
        role_id: cashierRole.id,
        outlet_ids: [outlet1Id]
      })
    });
    if (addDoniRes.status !== 201) throw new Error('Assign Doni failed');
    console.log(`✅ Doni assigned as Cashier to Outlet ID: ${outlet1Id}`);

    // Test 5.1: Doni checks his effective permissions
    const doniPermsRes = await fetch(`${BASE_URL}/my-permissions`, {
      headers: {
        'Authorization': `Bearer ${doniToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    const doniPermsData = await doniPermsRes.json();
    console.log(`Doni permissions: ${JSON.stringify(doniPermsData.data.permissions)}`);
    if (doniPermsData.data.is_owner || !doniPermsData.data.permissions.includes('sales.create')) {
      throw new Error('Doni effective permissions mismatch');
    }
    console.log('✅ PASS: Doni effective permissions match Cashier role template');

    // Test 5.2: Doni tries to create a role (Requires role.manage -> Should be 403 Forbidden)
    console.log('\n[Step 5.2] 🔒 Testing WHAT Permission Denied: Cashier attempts to create a role (POST /roles)...');
    const doniCreateRoleRes = await fetch(`${BASE_URL}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${doniToken}`,
        'X-Business-Id': businessId.toString()
      },
      body: JSON.stringify({
        name: 'Hacker Role',
        permission_ids: [1, 2]
      })
    });
    const doniCreateRoleData = await doniCreateRoleRes.json();
    console.log(`Doni create role status: ${doniCreateRoleRes.status} (Expected: 403)`);
    if (doniCreateRoleRes.status !== 403 || doniCreateRoleData.error_code !== 'INSUFFICIENT_PERMISSIONS') {
      throw new Error(`SECURITY FAILURE: Cashier was able to create role! Response: ${JSON.stringify(doniCreateRoleData)}`);
    }
    console.log('✅ PASS: Cashier blocked with 403 Forbidden (INSUFFICIENT_PERMISSIONS)');

    // Test 5.3: Doni tries to access Outlet 2 (WHERE Outlet Denied -> Should be 403 Forbidden)
    console.log('\n[Step 5.3] 🔒 Testing WHERE Outlet Denied: Cashier attempts to access unassigned Outlet 2...');
    const doniOutlet2Res = await fetch(`${BASE_URL}/outlets/${outlet2Id}`, {
      headers: {
        'Authorization': `Bearer ${doniToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    const doniOutlet2Data = await doniOutlet2Res.json();
    console.log(`Doni -> Outlet 2 status: ${doniOutlet2Res.status} (Expected: 403)`);
    if (doniOutlet2Res.status !== 403 || doniOutlet2Data.error_code !== 'OUTLET_ACCESS_DENIED') {
      throw new Error(`SECURITY FAILURE: Cashier accessed unassigned outlet! Response: ${JSON.stringify(doniOutlet2Data)}`);
    }
    console.log('✅ PASS: Cashier blocked with 403 Forbidden (OUTLET_ACCESS_DENIED)');

    // Test 5.4: Doni accesses Outlet 1 (WHAT & WHERE Authorized -> 200 OK)
    console.log('\n[Step 5.4] Testing Authorized Access: Cashier accesses assigned Outlet 1...');
    const doniOutlet1Res = await fetch(`${BASE_URL}/outlets/${outlet1Id}`, {
      headers: {
        'Authorization': `Bearer ${doniToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    if (doniOutlet1Res.status !== 200) throw new Error('Cashier should have access to Outlet 1');
    console.log('✅ PASS: Cashier successfully accessed assigned Outlet 1 (200 OK)');

    // ==============================================================
    // STEP 6: CREATE CUSTOM ROLE "SUPERVISOR OUTLET" & ASSIGN
    // ==============================================================
    console.log('\n[Step 6] Owner creates custom role "Supervisor Outlet"...');
    
    // Find permission IDs for: outlet.view, product.view, product.create, sales.view, sales.create, inventory.view
    const targetPermNames = [
      'outlet.view',
      'product.view',
      'product.create',
      'sales.view',
      'sales.create',
      'inventory.view'
    ];
    const supervisorPermIds = permsData.data.list
      .filter(p => targetPermNames.includes(p.name))
      .map(p => p.id);

    const createSupRoleRes = await fetch(`${BASE_URL}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      },
      body: JSON.stringify({
        name: 'Supervisor Outlet',
        description: 'Store supervisor with inventory viewing and product creation rights',
        permission_ids: supervisorPermIds
      })
    });
    const createSupRoleData = await createSupRoleRes.json();
    if (createSupRoleRes.status !== 201) throw new Error(`Create custom role failed: ${JSON.stringify(createSupRoleData)}`);
    
    const supervisorRoleId = createSupRoleData.data.id;
    console.log(`✅ Custom role "Supervisor Outlet" created with ID: ${supervisorRoleId}`);

    // Assign Agus as Supervisor Outlet in both Outlet 1 and Outlet 2
    console.log('Assigning Agus to "Supervisor Outlet" role with access to Outlets [1, 2]...');
    const addAgusRes = await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      },
      body: JSON.stringify({
        email: agusEmail,
        role_id: supervisorRoleId,
        outlet_ids: [outlet1Id, outlet2Id]
      })
    });
    if (addAgusRes.status !== 201) throw new Error('Assign Agus failed');

    // Verify Agus effective permissions
    const agusPermsRes = await fetch(`${BASE_URL}/my-permissions`, {
      headers: {
        'Authorization': `Bearer ${agusToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    const agusPermsData = await agusPermsRes.json();
    console.log(`Agus permissions: ${JSON.stringify(agusPermsData.data.permissions)}`);
    if (!agusPermsData.data.permissions.includes('product.create') || !agusPermsData.data.permissions.includes('inventory.view')) {
      throw new Error('Custom role permissions not granted properly to Agus');
    }
    console.log('✅ PASS: Agus received exact dynamic permissions from "Supervisor Outlet"');

    // ==============================================================
    // STEP 7: DYNAMIC ROLE UPDATE & PERMISSION MODIFICATION
    // ==============================================================
    console.log('\n[Step 7] Updating "Supervisor Outlet" role by adding "inventory.create" & "inventory.adjust"...');
    
    const extraPermNames = [...targetPermNames, 'inventory.create', 'inventory.adjust'];
    const updatedPermIds = permsData.data.list
      .filter(p => extraPermNames.includes(p.name))
      .map(p => p.id);

    const updateRoleRes = await fetch(`${BASE_URL}/roles/${supervisorRoleId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      },
      body: JSON.stringify({
        description: 'Updated supervisor role with inventory adjustment rights',
        permission_ids: updatedPermIds
      })
    });
    if (updateRoleRes.status !== 200) throw new Error('Update role failed');
    console.log('✅ Role permissions updated successfully');

    // Agus checks permissions again (Immediate dynamic effect)
    const agusPermsAgainRes = await fetch(`${BASE_URL}/my-permissions`, {
      headers: {
        'Authorization': `Bearer ${agusToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    const agusPermsAgainData = await agusPermsAgainRes.json();
    if (!agusPermsAgainData.data.permissions.includes('inventory.adjust')) {
      throw new Error('Dynamic permission update failed to reflect on user');
    }
    console.log('✅ PASS: Agus immediately gained "inventory.adjust" without requiring re-login');

    // ==============================================================
    // STEP 8: ROLE DELETION SAFEGUARDS
    // ==============================================================
    console.log('\n[Step 8] Testing Role Deletion Safeguards...');
    
    // 8.1 Attempt to delete default Admin role -> 403 Forbidden
    const delAdminRes = await fetch(`${BASE_URL}/roles/${adminRole.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    console.log(`Delete default Admin status: ${delAdminRes.status} (Expected: 403)`);
    if (delAdminRes.status !== 403) throw new Error('Safeguard failed: Default role was deleted!');
    console.log('✅ PASS: Server prevented deletion of system default Admin role');

    // 8.2 Attempt to delete "Supervisor Outlet" while Agus is still assigned -> 400 Bad Request
    const delInUseRoleRes = await fetch(`${BASE_URL}/roles/${supervisorRoleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    console.log(`Delete in-use role status: ${delInUseRoleRes.status} (Expected: 400)`);
    if (delInUseRoleRes.status !== 400) throw new Error('Safeguard failed: In-use role was deleted!');
    console.log('✅ PASS: Server prevented deletion of role currently in use by active users (400 Bad Request - ROLE_IN_USE)');

    // 8.3 Reassign Agus to Cashier and delete "Supervisor Outlet" -> 200 OK
    console.log('Reassigning Agus to Cashier role...');
    await fetch(`${BASE_URL}/business/members/${agusUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      },
      body: JSON.stringify({
        role_id: cashierRole.id
      })
    });

    console.log('Deleting "Supervisor Outlet" role after reassignment...');
    const delUnusedRoleRes = await fetch(`${BASE_URL}/roles/${supervisorRoleId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${ownerToken}`,
        'X-Business-Id': businessId.toString()
      }
    });
    if (delUnusedRoleRes.status !== 200) throw new Error('Delete unused role failed');
    console.log('✅ PASS: Custom role deleted successfully once no users were assigned');

    console.log('\n====================================================');
    console.log('🎉 ALL DYNAMIC RBAC & PERMISSION TESTS PASSED 100%!');
    console.log('====================================================\n');

  } finally {
    server.close();
    await sequelize.close();
  }
};

runDynamicRBACTests().catch(err => {
  console.error('\n❌ DYNAMIC RBAC TEST FAILED:', err);
  process.exit(1);
});
