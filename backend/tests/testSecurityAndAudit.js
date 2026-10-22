const app = require('../app');
const { testConnection, sequelize } = require('../config/database');
const { 
  User, 
  Business, 
  Outlet, 
  Product, 
  ProductVariant, 
  Ingredient, 
  Unit, 
  Recipe, 
  RecipeItem, 
  StockMovement, 
  Transaction, 
  AuditLog,
  Role,
  Permission
} = require('../models');

const runSecurityAndAuditTests = async () => {
  console.log('====================================================');
  console.log('🛡️  RUNNING PHASE 11 — SECURITY & AUDIT TEST SUITE');
  console.log('====================================================\n');

  await testConnection();

  const TEST_PORT = 5095;
  let server;
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, '127.0.0.1', () => {
      resolve();
    });
  });
  const BASE_URL = `http://127.0.0.1:${TEST_PORT}/api/v1`;

  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  const assert = (condition, title, details = '') => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [PASS] ${title}`);
    } else {
      failedTests++;
      console.error(`  ❌ [FAIL] ${title} --> (Assertion Failed)`);
      if (details) console.error(`     Details: ${details}`);
    }
  };

  try {
    const timestamp = Date.now();

    // ==============================================================
    // SECTION 1: AUTHENTICATION & TOKEN SECURITY
    // ==============================================================
    console.log('\n--- SECTION 1: Authentication & Token Security ---');

    // 1.1 Register Business A (Teh Nusantara)
    const emailA = `owner_a_${timestamp}@example.com`;
    const regARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Owner A',
        email: emailA,
        phone: `0812${timestamp.toString().slice(-8)}`,
        password: 'PasswordA123!',
        business_name: 'Teh Nusantara'
      })
    });
    const regAData = await regARes.json();
    assert(regARes.status === 201 && regAData.data.tokens.access_token, '1.1 Register Business A successfully');

    const tokenA = regAData.data.tokens.access_token;
    const refreshTokenA = regAData.data.tokens.refresh_token;
    const businessAId = regAData.data.business.id;
    const outletA1Id = regAData.data.outlet.id;

    // 1.2 Register Business B (Kopi Juara)
    const emailB = `owner_b_${timestamp}@example.com`;
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Owner B',
        email: emailB,
        phone: `0813${timestamp.toString().slice(-8)}`,
        password: 'PasswordB123!',
        business_name: 'Kopi Juara'
      })
    });
    const regBData = await regBRes.json();
    assert(regBRes.status === 201 && regBData.data.tokens.access_token, '1.2 Register Business B successfully');

    const tokenB = regBData.data.tokens.access_token;
    const businessBId = regBData.data.business.id;
    const outletB1Id = regBData.data.outlet.id;

    // 1.3 Login with invalid password
    const badLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: emailA,
        password: 'WrongPassword123!'
      })
    });
    assert(badLoginRes.status === 401, '1.3 Reject login with wrong password (401)');

    // 1.4 Refresh Token Rotation
    const refreshRes = await fetch(`${BASE_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: refreshTokenA
      })
    });
    const refreshData = await refreshRes.json();
    assert(refreshRes.status === 200 && refreshData.data.access_token, '1.4 Refresh token rotates access token (200)');

    // 1.5 Missing Token Rejected
    const missingTokenRes = await fetch(`${BASE_URL}/business`, {
      headers: { 'x-business-id': businessAId }
    });
    assert(missingTokenRes.status === 401, '1.5 Reject request with missing Authorization header (401)');

    // 1.6 Forged/Tampered JWT Signature Rejected
    const tamperedToken = tokenA.slice(0, -10) + 'xyz1234567';
    const tamperedRes = await fetch(`${BASE_URL}/business`, {
      headers: { 'Authorization': `Bearer ${tamperedToken}`, 'x-business-id': businessAId }
    });
    assert(tamperedRes.status === 401, '1.6 Reject tampered JWT token signature (401)');

    // ==============================================================
    // SECTION 2: TENANT ISOLATION (CROSS-TENANT PROTECTION)
    // ==============================================================
    console.log('\n--- SECTION 2: Strict Tenant Isolation ---');

    // 2.1 Create a Category and Product in Business A
    const catARes = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Minuman Segar' })
    });
    const catAData = await catARes.json();
    const catAId = catAData.data.id;

    const prodARes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Es Teh Melati Jumbo',
        sku: `SKU-TEA-${timestamp}`,
        category_id: catAId,
        selling_price: 5000,
        cost_price: 2000,
        track_stock: true,
        variants: [
          { name: 'Regular', selling_price: 5000, is_default: true },
          { name: 'Large', selling_price: 8000, is_default: false }
        ]
      })
    });
    const prodAData = await prodARes.json();
    const prodAId = prodAData.data.id;
    const variantRegular = prodAData.data.variants.find(v => v.name === 'Regular');
    assert(prodARes.status === 201 && prodAId, '2.1 Create Product in Business A');

    // 2.2 Business B tries to read Business A's Product
    const crossReadProdRes = await fetch(`${BASE_URL}/products/${prodAId}`, {
      headers: { 'Authorization': `Bearer ${tokenB}`, 'x-business-id': businessBId }
    });
    assert(crossReadProdRes.status === 404, '2.2 Business B cannot read Business A product (404 Not Found)');

    // 2.3 Business B tries to update Business A's Product
    const crossUpdateProdRes = await fetch(`${BASE_URL}/products/${prodAId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'x-business-id': businessBId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Hacked Es Teh' })
    });
    assert(crossUpdateProdRes.status === 404, '2.3 Business B cannot update Business A product (404 Not Found)');

    // 2.4 Business B tries to delete Business A's Product
    const crossDeleteProdRes = await fetch(`${BASE_URL}/products/${prodAId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${tokenB}`, 'x-business-id': businessBId }
    });
    assert(crossDeleteProdRes.status === 404, '2.4 Business B cannot delete Business A product (404 Not Found)');

    // 2.5 User A attempts Business ID Spoofing (Header x-business-id: Business B with User A's token)
    const spoofTenantRes = await fetch(`${BASE_URL}/products`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessBId }
    });
    assert(spoofTenantRes.status === 403, '2.5 Header Business ID spoofing rejected (403 Forbidden)');

    // ==============================================================
    // SECTION 3: OUTLET SCOPED ACCESS & RESTRICTIONS
    // ==============================================================
    console.log('\n--- SECTION 3: Outlet Scoped Access & Restrictions ---');

    // Upgrade Business A subscription to Pro so it can create multiple outlets
    const plansRes = await fetch(`${BASE_URL}/subscription/plans`);
    const plansData = await plansRes.json();
    const proPlan = plansData.data.find(p => p.code === 'PRO') || plansData.data[plansData.data.length - 1];

    await fetch(`${BASE_URL}/subscription/upgrade`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: proPlan.id })
    });

    // 3.1 Create second outlet in Business A (Outlet A2 - Slawi)
    const out2Res = await fetch(`${BASE_URL}/outlets`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Outlet Slawi', code: `OUT-SLAWI-${timestamp.toString().slice(-4)}` })
    });
    const out2Data = await out2Res.json();
    const outletA2Id = out2Data.data.id;
    assert(out2Res.status === 201 && outletA2Id, '3.1 Create Outlet Slawi (Outlet 2) in Business A');

    // 3.2 Register Cashier User for Business A
    const cashierEmail = `cashier_${timestamp}@example.com`;
    const regCashierRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Budi Kasir',
        email: cashierEmail,
        phone: `0814${timestamp.toString().slice(-8)}`,
        password: 'PasswordKasir123!',
        business_name: 'Budi Personal Store'
      })
    });
    const regCashierData = await regCashierRes.json();
    const cashierToken = regCashierData.data.tokens.access_token;
    const cashierUserId = regCashierData.data.user.id;

    // Get Cashier Role ID in Business A
    const rolesRes = await fetch(`${BASE_URL}/roles`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const rolesData = await rolesRes.json();
    const cashierRole = rolesData.data.find(r => r.name === 'Cashier');

    // 3.3 Add Cashier to Business A assigned ONLY to Outlet 1
    const addMemberRes = await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cashierEmail,
        role_id: cashierRole.id,
        outlet_ids: [outletA1Id]
      })
    });
    assert(addMemberRes.status === 201, '3.3 Cashier assigned strictly to Outlet 1 in Business A');

    // 3.4 Cashier tries to record transaction in Outlet 2 (Unauthorized outlet)
    const unauthOutletTxRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cashierToken}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outletA2Id,
        items: [{ product_id: prodAId, variant_id: variantRegular.id, quantity: 1 }],
        payment: { method: 'CASH', paid_amount: 5000 }
      })
    });
    assert(unauthOutletTxRes.status === 403, '3.4 Cashier restricted from transacting in unauthorized Outlet 2 (403)', `Got status ${unauthOutletTxRes.status}`);

    // ==============================================================
    // SECTION 4: DYNAMIC RBAC & PERMISSION BARRIERS
    // ==============================================================
    console.log('\n--- SECTION 4: Dynamic RBAC & Permission Enforcement ---');

    // 4.1 Cashier attempts product creation (lacks product.create permission)
    const cashierProdRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cashierToken}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Unauthorized Product',
        sku: `SKU-UNAUTH-${timestamp}`,
        category_id: catAId,
        selling_price: 10000
      })
    });
    assert(cashierProdRes.status === 403, '4.1 Cashier cannot create product without permission (403 Forbidden)');

    // 4.2 Cashier attempts to adjust stock (lacks inventory.adjust permission)
    const cashierAdjRes = await fetch(`${BASE_URL}/inventory/adjustment`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cashierToken}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outletA1Id,
        ingredient_id: 1,
        actual_stock: 100
      })
    });
    assert(cashierAdjRes.status === 403, '4.2 Cashier cannot adjust inventory without permission (403 Forbidden)');

    // 4.3 Cashier attempts to view audit logs (lacks business.view permission)
    const cashierAuditRes = await fetch(`${BASE_URL}/audit-logs`, {
      headers: { 'Authorization': `Bearer ${cashierToken}`, 'x-business-id': businessAId }
    });
    assert(cashierAuditRes.status === 403, '4.3 Cashier cannot view business audit logs without permission (403)');

    // ==============================================================
    // SECTION 5: INPUT VALIDATION & BOUND CHECKS
    // ==============================================================
    console.log('\n--- SECTION 5: Strict Input Validation & Boundaries ---');

    // 5.1 Reject Negative Product Price
    const negPriceRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Negative Tea',
        sku: `SKU-NEG-${timestamp}`,
        category_id: catAId,
        selling_price: -5000
      })
    });
    assert(negPriceRes.status === 400 || negPriceRes.status === 422, '5.1 Reject product with negative price (400/422)');

    // 5.2 Reject Duplicate SKU in same business
    const dupSkuRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate SKU Product',
        sku: `SKU-TEA-${timestamp}`, // same SKU as 2.1
        category_id: catAId,
        selling_price: 5000
      })
    });
    assert(dupSkuRes.status === 400 || dupSkuRes.status === 409, '5.2 Reject duplicate SKU within same business (400/409)');

    // 5.3 Reject Negative Stock Movement
    // Setup Unit and Ingredient first
    const unitRes = await fetch(`${BASE_URL}/units`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Gram', symbol: 'g' })
    });
    const unitData = await unitRes.json();
    const unitId = unitData.data.id;

    const ingRes = await fetch(`${BASE_URL}/ingredients`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Daun Teh Melati',
        sku: `ING-TEH-${timestamp}`,
        unit_id: unitId,
        minimum_stock: 100,
        cost_per_unit: 50
      })
    });
    const ingData = await ingRes.json();
    const ingId = ingData.data.id;

    const negStockRes = await fetch(`${BASE_URL}/inventory/stock-in`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outletA1Id,
        ingredient_id: ingId,
        quantity: 0
      })
    });
    assert(negStockRes.status === 400 || negStockRes.status === 422, '5.3 Reject stock in quantity <= 0 (400/422)');

    // ==============================================================
    // SECTION 6: TRANSACTION SAFETY & INVENTORY INTEGRATION
    // ==============================================================
    console.log('\n--- SECTION 6: Transaction Safety & Business Invariants ---');

    // 6.1 Setup Recipe for Product Variant Regular
    const recipeRes = await fetch(`${BASE_URL}/recipes`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: prodAId,
        product_variant_id: variantRegular.id,
        items: [{ ingredient_id: ingId, quantity: 10 }] // 10g tea per cup
      })
    });
    assert(recipeRes.status === 201, '6.1 Recipe created linking Product Variant to Ingredient');

    // 6.2 Attempt Transaction with Zero Stock (Strict stock deduction enforcement)
    const zeroStockTxRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outletA1Id,
        items: [{ product_id: prodAId, variant_id: variantRegular.id, quantity: 5 }],
        payment: { method: 'CASH', paid_amount: 25000 }
      })
    });
    assert(zeroStockTxRes.status === 400, '6.2 Reject transaction when ingredient stock is insufficient (400)');

    // 6.3 Restock Ingredient (500g)
    const stockInRes = await fetch(`${BASE_URL}/inventory/stock-in`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outletA1Id,
        ingredient_id: ingId,
        quantity: 500,
        notes: 'Restock batch #1'
      })
    });
    assert(stockInRes.status === 201, '6.3 Stock In successfully recorded (500g)');

    // 6.4 Reject Underpaid Cash Transaction
    const underpaidTxRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outletA1Id,
        items: [{ product_id: prodAId, variant_id: variantRegular.id, quantity: 2 }], // total 10,000
        payment: { method: 'CASH', paid_amount: 5000 } // Underpaid!
      })
    });
    assert(underpaidTxRes.status === 400, '6.4 Reject CASH transaction when paid_amount < total (400 Bad Request)');

    // 6.5 Execute Valid POS Transaction (Deducts 2 * 10g = 20g tea from 500g -> 480g)
    const validTxRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        outlet_id: outletA1Id,
        items: [{ product_id: prodAId, variant_id: variantRegular.id, quantity: 2 }],
        payment: { method: 'CASH', paid_amount: 10000 }
      })
    });
    const validTxData = await validTxRes.json();
    const txId = validTxData.data.id;
    assert(validTxRes.status === 201 && validTxData.data.payment_status === 'PAID', '6.5 Valid POS transaction completed (PAID)');

    // Check stock balance after transaction
    const stockCheck1Res = await fetch(`${BASE_URL}/inventory/stock?outlet_id=${outletA1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const stockCheck1Data = await stockCheck1Res.json();
    const ingStock1 = stockCheck1Data.data.items.find(s => s.ingredient_id === ingId);
    assert(ingStock1 && ingStock1.current_stock === 480, '6.6 Inventory auto-deducted atomically (500g - 20g = 480g)');

    // 6.7 Cancel Transaction and verify Stock Restoration
    const cancelTxRes = await fetch(`${BASE_URL}/transactions/${txId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Customer changed mind' })
    });
    assert(cancelTxRes.status === 200, '6.7 Transaction cancelled successfully');

    const stockCheck2Res = await fetch(`${BASE_URL}/inventory/stock?outlet_id=${outletA1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const stockCheck2Data = await stockCheck2Res.json();
    const ingStock2 = stockCheck2Data.data.items.find(s => s.ingredient_id === ingId);
    assert(ingStock2 && ingStock2.current_stock === 500, '6.8 Inventory restored atomically upon cancellation (480g + 20g = 500g)');

    // 6.9 Prevent Double Cancellation
    const doubleCancelRes = await fetch(`${BASE_URL}/transactions/${txId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Double cancel attempt' })
    });
    assert(doubleCancelRes.status === 400 || doubleCancelRes.status === 422, '6.9 Prevent double cancellation of already cancelled transaction (400/422)');

    // ==============================================================
    // SECTION 7: AUDIT LOG VERIFICATION & IMMUTABILITY
    // ==============================================================
    console.log('\n--- SECTION 7: Audit Log Verification ---');

    // 7.1 Owner A Views Audit Logs
    const auditLogsRes = await fetch(`${BASE_URL}/audit-logs`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const auditLogsData = await auditLogsRes.json();
    const logs = auditLogsData.data.logs;
    const actions = logs.map(l => l.action);

    assert(auditLogsRes.status === 200 && logs.length > 0, '7.1 Audit logs retrieved successfully');
    assert(actions.includes('BUSINESS_CREATED'), '7.2 BUSINESS_CREATED audit log present');
    assert(actions.includes('PRODUCT_CREATED'), '7.3 PRODUCT_CREATED audit log present');
    assert(actions.includes('STOCK_IN'), '7.4 STOCK_IN audit log present');
    assert(actions.includes('TRANSACTION_CREATED') || actions.includes('TRANSACTION_COMPLETED'), '7.5 TRANSACTION_CREATED audit log present');
    assert(actions.includes('TRANSACTION_CANCELLED'), '7.6 TRANSACTION_CANCELLED audit log present');
    assert(actions.includes('MEMBER_ADDED'), '7.7 MEMBER_ADDED audit log present');

    // 7.8 Business B Views Audit Logs and cannot see Business A's logs
    const auditLogsBRes = await fetch(`${BASE_URL}/audit-logs`, {
      headers: { 'Authorization': `Bearer ${tokenB}`, 'x-business-id': businessBId }
    });
    const auditLogsBData = await auditLogsBRes.json();
    const logsB = auditLogsBData.data.logs;
    const hasLeak = logsB.some(l => l.business_id === businessAId);
    assert(auditLogsBRes.status === 200 && !hasLeak, '7.8 Audit logs are strictly isolated per tenant (No cross-tenant leak)');

  } catch (error) {
    console.error('\n❌ Unhandled error during Security test execution:', error);
    failedTests++;
  } finally {
    if (server) {
      server.close();
    }
  }

  console.log('\n====================================================');
  console.log(`🏁 PHASE 11 SECURITY & AUDIT TESTS SUMMARY:`);
  console.log(`   Total Tests:  ${totalTests}`);
  console.log(`   Passed Tests: ${passedTests}`);
  console.log(`   Failed Tests: ${failedTests}`);
  console.log('====================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
};

if (require.main === module) {
  runSecurityAndAuditTests();
}

module.exports = runSecurityAndAuditTests;
