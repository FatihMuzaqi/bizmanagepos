const app = require('../app');
const { testConnection } = require('../config/database');

const runExpenseReportsTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 8 — EXPENSE & REPORTS INTEGRATION TESTS');
  console.log('====================================================\n');

  await testConnection();

  const TEST_PORT = 5070;
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
    // SETUP: BUSINESS A (RESTO RASA NUSANTARA) & BUSINESS B (CAFE KOPI)
    // ==============================================================
    console.log('[Setup 1] Registering Business A Owner (Resto Rasa Nusantara)...');
    const ownerAEmail = `owner_resto_${timestamp}@example.com`;
    const regARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pak Hendra',
        email: ownerAEmail,
        phone: `0811${timestamp.toString().slice(-8)}`,
        password: 'PasswordA123!',
        business_name: 'Resto Rasa Nusantara'
      })
    });
    const regAData = await regARes.json();
    const tokenA = regAData.data.tokens.access_token;
    const businessAId = regAData.data.business.id;
    console.log(`✅ Business A created: ID ${businessAId}`);

    // Upgrade plan to Enterprise to allow multi-outlet testing
    const { Subscription } = require('../models');
    await Subscription.update({ plan_id: 4 }, { where: { business_id: businessAId } });

    // Outlet 1 (Main)
    const outletsARes = await fetch(`${BASE_URL}/outlets`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const outletsAData = await outletsARes.json();
    const outlet1Id = outletsAData.data[0].id;

    // Create Outlet 2 (Cabang)
    const createOutlet2Res = await fetch(`${BASE_URL}/outlets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Resto Cabang Barat',
        code: `RRN-CBR-${timestamp.toString().slice(-4)}`
      })
    });
    const createOutlet2Data = await createOutlet2Res.json();
    const outlet2Id = createOutlet2Data.data.id;
    console.log(`✅ Outlets: Outlet 1 (${outlet1Id}), Outlet 2 (${outlet2Id})`);

    // Business B
    console.log('[Setup 2] Registering Business B Owner (Cafe Kopi)...');
    const ownerBEmail = `owner_cafe_${timestamp}@example.com`;
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pak Doni',
        email: ownerBEmail,
        phone: `0822${timestamp.toString().slice(-8)}`,
        password: 'PasswordB123!',
        business_name: 'Cafe Kopi Kenangan'
      })
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.data.tokens.access_token;
    const businessBId = regBData.data.business.id;

    // Staff 1: Kasir Doni (Cashier Role -> NO report.view, NO expense.create, assigned to Outlet 1)
    console.log('[Setup 3] Registering Staff 1: Kasir Doni (Cashier Role)...');
    const doniEmail = `doni_kasir_${timestamp}@example.com`;
    const regDoniRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Doni Kasir',
        email: doniEmail,
        phone: `0833${timestamp.toString().slice(-8)}`,
        password: 'PasswordDoni123!',
        business_name: 'Doni Personal'
      })
    });
    const regDoniData = await regDoniRes.json();
    const doniUserId = regDoniData.data.user.id;

    const { Role } = require('../models');
    const cashierRole = await Role.findOne({
      where: { business_id: businessAId, name: 'Cashier' }
    });

    await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId.toString(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: doniEmail, role_id: cashierRole.id, outlet_ids: [outlet1Id] })
    });

    const loginDoniRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: doniEmail, password: 'PasswordDoni123!' })
    });
    const loginDoniData = await loginDoniRes.json();
    const tokenDoni = loginDoniData.data.tokens.access_token;

    // Staff 2: Manager Maya (Custom Role: report.view, expense.view, expense.create, expense.update, assigned to Outlet 1)
    console.log('[Setup 4] Registering Staff 2: Manager Maya (Manager Role)...');
    const mayaEmail = `maya_mgr_${timestamp}@example.com`;
    const regMayaRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Maya Manager',
        email: mayaEmail,
        phone: `0844${timestamp.toString().slice(-8)}`,
        password: 'PasswordMaya123!',
        business_name: 'Maya Personal'
      })
    });
    const regMayaData = await regMayaRes.json();

    // Look up Permission IDs for Manager
    const { Permission } = require('../models');
    const targetPerms = await Permission.findAll({
      where: {
        name: ['report.view', 'expense.view', 'expense.create', 'expense.update', 'sales.view', 'sales.create']
      }
    });
    const managerPermIds = targetPerms.map(p => p.id);

    // Create Manager Role in Business A
    const createRoleRes = await fetch(`${BASE_URL}/rbac/roles`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId.toString(), 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Manager Outlet ${timestamp}`,
        permission_ids: managerPermIds
      })
    });
    const createRoleData = await createRoleRes.json();
    const managerRoleId = createRoleData.data.id;

    await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId.toString(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mayaEmail, role_id: managerRoleId, outlet_ids: [outlet1Id] })
    });

    const loginMayaRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: mayaEmail, password: 'PasswordMaya123!' })
    });
    const loginMayaData = await loginMayaRes.json();
    const tokenMaya = loginMayaData.data.tokens.access_token;

    // ==============================================================
    // SETUP: PRODUCTS, RECIPES, INGREDIENTS & STOCK
    // ==============================================================
    console.log('[Setup 5] Creating Master Products (Es Teh & Kopi Susu)...');
    const prodTehRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Es Teh Manis ${timestamp}`, selling_price: 5000, track_stock: false })
    });
    const prodTehData = await prodTehRes.json();
    const prodTehId = prodTehData.data.id;

    const prodKopiRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Kopi Susu Gula Aren ${timestamp}`, selling_price: 10000, track_stock: false })
    });
    const prodKopiData = await prodKopiRes.json();
    const prodKopiId = prodKopiData.data.id;

    // Record Transactions in Outlet 1:
    // Tx 1: 3x Es Teh Manis = 15.000
    await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outlet1Id,
        items: [{ product_id: prodTehId, quantity: 3 }],
        payment: { method: 'CASH', paid_amount: 15000 }
      })
    });
    // Tx 2: 2x Kopi Susu = 20.000
    await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outlet1Id,
        items: [{ product_id: prodKopiId, quantity: 2 }],
        payment: { method: 'QRIS', paid_amount: 20000 }
      })
    });
    console.log('✅ Outlet 1 Sales recorded: Rp 35.000 (5 items)');

    // Record Transaction in Outlet 2:
    // Tx 3: 4x Es Teh Manis = 20.000
    await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outlet2Id,
        items: [{ product_id: prodTehId, quantity: 4 }],
        payment: { method: 'CASH', paid_amount: 20000 }
      })
    });
    console.log('✅ Outlet 2 Sales recorded: Rp 20.000 (4 items)');

    // ==============================================================
    // SETUP: EXPENSE CATEGORIES & EXPENSES
    // ==============================================================
    console.log('[Setup 6] Creating Expense Categories...');
    const catOpsRes = await fetch(`${BASE_URL}/expense-categories`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Operasional Toko ${timestamp}`, description: 'Biaya harian' })
    });
    const catOpsData = await catOpsRes.json();
    const catOpsId = catOpsData.data.id;

    const catUtilRes = await fetch(`${BASE_URL}/expense-categories`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `Listrik & Air ${timestamp}`, description: 'Utilitas' })
    });
    const catUtilData = await catUtilRes.json();
    const catUtilId = catUtilData.data.id;

    // Record Expense in Outlet 1: Rp 10.000 (Operasional)
    const exp1Res = await fetch(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outlet1Id,
        category_id: catOpsId,
        amount: 10000,
        description: 'Beli plastik & sedotan'
      })
    });
    const exp1Data = await exp1Res.json();
    const exp1Id = exp1Data.data.id;

    // Record Expense in Outlet 2: Rp 15.000 (Listrik)
    await fetch(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outlet2Id,
        category_id: catUtilId,
        amount: 15000,
        description: 'Token listrik'
      })
    });
    console.log('✅ Expenses recorded: Outlet 1 (Rp 10.000), Outlet 2 (Rp 15.000)');

    // ==============================================================
    // TEST 1: DASHBOARD SUMMARY
    // ==============================================================
    console.log('\n--- [TEST 1] GET /reports/dashboard ---');
    const dashRes = await fetch(`${BASE_URL}/reports/dashboard`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const dashData = await dashRes.json();
    console.log('Dashboard Data:', JSON.stringify(dashData.data));

    if (
      dashRes.status === 200 &&
      dashData.data.sales_today === 55000 &&
      dashData.data.transactions_today === 3 &&
      dashData.data.expenses_today === 25000 &&
      dashData.data.products_sold_today === 9 &&
      dashData.data.net_income_today === 30000
    ) {
      console.log('✅ PASS: Dashboard summary computed accurate figures across all outlets');
    } else {
      throw new Error(`Test 1 Failed: unexpected dashboard data: ${JSON.stringify(dashData)}`);
    }

    // ==============================================================
    // TEST 2: SALES REPORT & OUTLET FILTER
    // ==============================================================
    console.log('\n--- [TEST 2] GET /reports/sales ---');
    const salesAllRes = await fetch(`${BASE_URL}/reports/sales?date_preset=today`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const salesAllData = await salesAllRes.json();
    console.log('All Outlets Sales Report:', JSON.stringify(salesAllData.data));

    if (
      salesAllRes.status === 200 &&
      salesAllData.data.total_sales === 55000 &&
      salesAllData.data.transaction_count === 3 &&
      salesAllData.data.payment_methods.length === 2
    ) {
      console.log('✅ PASS: Sales report aggregated correctly across all payment methods');
    } else {
      throw new Error(`Test 2 Failed: Sales report mismatch: ${JSON.stringify(salesAllData)}`);
    }

    // Filter by Outlet 1
    const salesOutlet1Res = await fetch(`${BASE_URL}/reports/sales?outlet_id=${outlet1Id}&date_preset=today`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const salesOutlet1Data = await salesOutlet1Res.json();
    if (salesOutlet1Data.data.total_sales === 35000 && salesOutlet1Data.data.transaction_count === 2) {
      console.log('✅ PASS: Sales report filtered by Outlet 1 correctly (Rp 35.000, 2 tx)');
    } else {
      throw new Error(`Test 2 Failed: Outlet 1 sales mismatch: ${JSON.stringify(salesOutlet1Data)}`);
    }

    // ==============================================================
    // TEST 3: PRODUCT SALES REPORT
    // ==============================================================
    console.log('\n--- [TEST 3] GET /reports/products ---');
    const prodReportRes = await fetch(`${BASE_URL}/reports/products?date_preset=today`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const prodReportData = await prodReportRes.json();
    console.log('Product Report:', JSON.stringify(prodReportData.data.products));

    const tehStats = prodReportData.data.products.find(p => p.product_id === prodTehId);
    const kopiStats = prodReportData.data.products.find(p => p.product_id === prodKopiId);

    if (
      tehStats?.quantity_sold === 7 &&
      tehStats?.revenue === 35000 &&
      kopiStats?.quantity_sold === 2 &&
      kopiStats?.revenue === 20000
    ) {
      console.log('✅ PASS: Product sales performance correctly calculated');
    } else {
      throw new Error(`Test 3 Failed: Product performance mismatch: ${JSON.stringify(prodReportData)}`);
    }

    // ==============================================================
    // TEST 4: OUTLET COMPARISON REPORT
    // ==============================================================
    console.log('\n--- [TEST 4] GET /reports/outlets ---');
    const outletReportRes = await fetch(`${BASE_URL}/reports/outlets?date_preset=today`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const outletReportData = await outletReportRes.json();
    console.log('Outlet Comparison Report:', JSON.stringify(outletReportData.data.outlets));

    const out1Stats = outletReportData.data.outlets.find(o => o.outlet_id === outlet1Id);
    const out2Stats = outletReportData.data.outlets.find(o => o.outlet_id === outlet2Id);

    if (
      out1Stats?.sales === 35000 && out1Stats?.expense === 10000 && out1Stats?.net_profit === 25000 &&
      out2Stats?.sales === 20000 && out2Stats?.expense === 15000 && out2Stats?.net_profit === 5000
    ) {
      console.log('✅ PASS: Outlet comparison report generated accurate profit & loss figures');
    } else {
      throw new Error(`Test 4 Failed: Outlet comparison mismatch: ${JSON.stringify(outletReportData)}`);
    }

    // ==============================================================
    // TEST 5: EXPENSE REPORT
    // ==============================================================
    console.log('\n--- [TEST 5] GET /reports/expenses ---');
    const expReportRes = await fetch(`${BASE_URL}/reports/expenses?date_preset=today`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const expReportData = await expReportRes.json();
    console.log('Expense Report Categories:', JSON.stringify(expReportData.data.categories));

    if (expReportData.data.total_expense === 25000 && expReportData.data.categories.length === 2) {
      console.log('✅ PASS: Expense breakdown report grouped by category successfully');
    } else {
      throw new Error(`Test 5 Failed: Expense report mismatch: ${JSON.stringify(expReportData)}`);
    }

    // ==============================================================
    // TEST 6: DATE FILTER PRESETS
    // ==============================================================
    console.log('\n--- [TEST 6] Date Filter Presets (yesterday, this_month, custom) ---');
    const yesterdayRes = await fetch(`${BASE_URL}/reports/dashboard?date_preset=yesterday`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const yesterdayData = await yesterdayRes.json();
    console.log('Yesterday Sales:', yesterdayData.data.sales_today);

    const monthRes = await fetch(`${BASE_URL}/reports/dashboard?date_preset=this_month`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const monthData = await monthRes.json();
    console.log('This Month Sales:', monthData.data.sales_today);

    if (yesterdayData.data.sales_today === 0 && monthData.data.sales_today >= 55000) {
      console.log('✅ PASS: Date preset filtering handles Asia/Jakarta boundaries accurately');
    } else {
      throw new Error(`Test 6 Failed: Date filtering issue: ${JSON.stringify(yesterdayData)}`);
    }

    // ==============================================================
    // TEST 7: MULTI-TENANT ISOLATION
    // ==============================================================
    console.log('\n--- [TEST 7] Multi-Tenant Isolation ---');
    const tenantDashRes = await fetch(`${BASE_URL}/reports/dashboard`, {
      headers: { 'Authorization': `Bearer ${tokenB}`, 'x-business-id': businessBId }
    });
    const tenantDashData = await tenantDashRes.json();
    if (tenantDashData.data.sales_today === 0 && tenantDashData.data.expenses_today === 0) {
      console.log('✅ PASS: Business B cannot see Business A financial reports');
    } else {
      throw new Error(`Test 7 Failed: Tenant isolation breach: ${JSON.stringify(tenantDashData)}`);
    }

    // ==============================================================
    // TEST 8: OUTLET SCOPING IN REPORTS & EXPENSES
    // ==============================================================
    console.log('\n--- [TEST 8] Outlet Scoping for Manager Maya (Outlet 1 Only) ---');
    const mayaDashRes = await fetch(`${BASE_URL}/reports/dashboard`, {
      headers: { 'Authorization': `Bearer ${tokenMaya}`, 'x-business-id': businessAId }
    });
    const mayaDashData = await mayaDashRes.json();
    console.log('Manager Maya Dashboard (Outlet 1 only):', JSON.stringify(mayaDashData.data));

    if (mayaDashData.data.sales_today === 35000 && mayaDashData.data.expenses_today === 10000) {
      console.log('✅ PASS: Scoped user automatically restricted to assigned outlet metrics');
    } else {
      throw new Error(`Test 8 Failed: Scoped outlet report mismatch: ${JSON.stringify(mayaDashData)}`);
    }

    // Manager Maya tries to create expense in Outlet 2 -> expect 403 Forbidden
    const mayaExpBreachRes = await fetch(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenMaya}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ outlet_id: outlet2Id, category_id: catOpsId, amount: 5000 })
    });
    if (mayaExpBreachRes.status === 403) {
      console.log('✅ PASS: Scoped user cannot create expense in unauthorized outlet (403 Forbidden)');
    } else {
      throw new Error(`Test 8 Failed: Expected 403, got ${mayaExpBreachRes.status}`);
    }

    // ==============================================================
    // TEST 9: PERMISSION ENFORCEMENT
    // ==============================================================
    console.log('\n--- [TEST 9] RBAC Permission Enforcement ---');
    // Kasir Doni (no report.view) tries to access dashboard:
    const doniDashRes = await fetch(`${BASE_URL}/reports/dashboard`, {
      headers: { 'Authorization': `Bearer ${tokenDoni}`, 'x-business-id': businessAId }
    });
    if (doniDashRes.status === 403) {
      console.log('✅ PASS: User without report.view rejected from viewing reports (403 Forbidden)');
    } else {
      throw new Error(`Test 9 Failed: Expected 403, got ${doniDashRes.status}`);
    }

    // Kasir Doni (no expense.create) tries to create expense:
    const doniExpRes = await fetch(`${BASE_URL}/expenses`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenDoni}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ outlet_id: outlet1Id, category_id: catOpsId, amount: 5000 })
    });
    if (doniExpRes.status === 403) {
      console.log('✅ PASS: User without expense.create rejected from creating expenses (403 Forbidden)');
    } else {
      throw new Error(`Test 9 Failed: Expected 403, got ${doniExpRes.status}`);
    }

    // ==============================================================
    // TEST 10: EXPENSE CANCELLATION & DASHBOARD REAL-TIME REFLECTION
    // ==============================================================
    console.log('\n--- [TEST 10] Expense Cancellation & Dashboard Real-Time Recalculation ---');
    const cancelExpRes = await fetch(`${BASE_URL}/expenses/${exp1Id}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Duplicate entry' })
    });
    const cancelExpData = await cancelExpRes.json();
    console.log('Cancel Expense status:', cancelExpRes.status, 'Status:', cancelExpData.data?.status);

    if (cancelExpRes.status === 200 && cancelExpData.data.status === 'CANCELLED') {
      console.log('✅ PASS: Expense cancelled successfully');
    } else {
      throw new Error(`Test 10 Failed: Expense cancel failed: ${JSON.stringify(cancelExpData)}`);
    }

    // Re-check Dashboard -> expenses_today must decrease from 25.000 to 15.000 (and net income increases to 40.000)
    const dashAfterCancelRes = await fetch(`${BASE_URL}/reports/dashboard`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const dashAfterCancelData = await dashAfterCancelRes.json();
    console.log('Dashboard after cancel:', JSON.stringify(dashAfterCancelData.data));

    if (dashAfterCancelData.data.expenses_today === 15000 && dashAfterCancelData.data.net_income_today === 40000) {
      console.log('✅ PASS: Dashboard updated real-time after expense cancellation');
    } else {
      throw new Error(`Test 10 Failed: Dashboard after cancel mismatch: ${JSON.stringify(dashAfterCancelData)}`);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 8 INTEGRATION TESTS PASSED (100% GREEN)');
    console.log('====================================================\n');

  } finally {
    server.close();
  }
};

if (require.main === module) {
  runExpenseReportsTests().catch(err => {
    console.error('❌ Integration Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = runExpenseReportsTests;
