const app = require('../app');
const { testConnection, sequelize } = require('../config/database');

const runPosTransactionTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 7 — POS & TRANSACTION INTEGRATION TESTS');
  console.log('====================================================\n');

  await testConnection();

  const TEST_PORT = 5065;
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
    // SETUP: BUSINESS A (ES TEH NUSANTARA) & BUSINESS B (WARUNG MAKAN)
    // ==============================================================
    console.log('[Setup 1] Registering Business A Owner (Es Teh Nusantara)...');
    const ownerAEmail = `owner_esteh_${timestamp}@example.com`;
    const regARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Pak Bambang',
        email: ownerAEmail,
        phone: `0811${timestamp.toString().slice(-8)}`,
        password: 'PasswordA123!',
        business_name: 'Es Teh Nusantara Jaya'
      })
    });
    const regAData = await regARes.json();
    const tokenA = regAData.data.tokens.access_token;
    const businessAId = regAData.data.business.id;
    console.log(`✅ Business A created: ID ${businessAId}`);

    // Upgrade plan to Enterprise to allow multi-outlet testing
    const { Subscription } = require('../models');
    await Subscription.update({ plan_id: 4 }, { where: { business_id: businessAId } });

    // Get Outlet 1 (Default Central Outlet)
    const outletsARes = await fetch(`${BASE_URL}/outlets`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const outletsAData = await outletsARes.json();
    const outlet1Id = outletsAData.data[0].id;
    console.log(`✅ Outlet 1 ID: ${outlet1Id}`);

    // Create Outlet 2 (Cabang Timur)
    const createOutlet2Res = await fetch(`${BASE_URL}/outlets`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Es Teh Cabang Timur',
        code: `ET-TMR-${timestamp.toString().slice(-4)}`,
        address: 'Jl. Raya Timur No. 45'
      })
    });
    const createOutlet2Data = await createOutlet2Res.json();
    const outlet2Id = createOutlet2Data.data.id;
    console.log(`✅ Outlet 2 ID: ${outlet2Id}`);

    // Setup Business B
    console.log('\n[Setup 2] Registering Business B Owner (Warung Sedap)...');
    const ownerBEmail = `owner_warung_${timestamp}@example.com`;
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ibu Siti',
        email: ownerBEmail,
        phone: `0822${timestamp.toString().slice(-8)}`,
        password: 'PasswordB123!',
        business_name: 'Warung Sedap Mantap'
      })
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.data.tokens.access_token;
    const businessBId = regBData.data.business.id;
    console.log(`✅ Business B created: ID ${businessBId}`);

    // Setup Staff 1: Kasir Budi (Assigned Cashier Role -> has sales.create, sales.view, but NO sales.cancel)
    console.log('\n[Setup 3] Registering Kasir Budi in Business A...');
    const cashierEmail = `budi_kasir_${timestamp}@example.com`;
    const regCashierRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kasir Budi',
        email: cashierEmail,
        phone: `0833${timestamp.toString().slice(-8)}`,
        password: 'PasswordBudi123!',
        business_name: 'Budi Personal'
      })
    });
    const regCashierData = await regCashierRes.json();
    const cashierUserId = regCashierData.data.user.id;

    // Get Cashier Role ID in Business A
    const { Role } = require('../models');
    const cashierRole = await Role.findOne({
      where: { business_id: businessAId, name: 'Cashier' }
    });

    // Add Budi to Business A as Cashier assigned to Outlet 1
    const addBudiRes = await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId.toString(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: cashierEmail,
        role_id: cashierRole.id,
        outlet_ids: [outlet1Id]
      })
    });
    const addBudiData = await addBudiRes.json();
    console.log('Add Budi Response:', addBudiRes.status, addBudiData.message);

    // Login Kasir Budi
    const loginBudiRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cashierEmail,
        password: 'PasswordBudi123!'
      })
    });
    const loginBudiData = await loginBudiRes.json();
    const tokenBudi = loginBudiData.data.tokens.access_token;
    console.log(`✅ Kasir Budi setup completed with scoped access to Outlet 1`);

    // ==============================================================
    // SETUP: UNITS, INGREDIENTS, RECIPES, PRODUCTS & STOCK IN
    // ==============================================================
    console.log('\n[Setup 4] Creating Units (Gram, ML, Pcs)...');
    const createUnit = async (name, symbol) => {
      const res = await fetch(`${BASE_URL}/units`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, symbol })
      });
      const data = await res.json();
      return data.data.id;
    };
    const unitGramId = await createUnit(`Gram_${timestamp}`, 'g');
    const unitPcsId = await createUnit(`Pcs_${timestamp}`, 'pcs');

    console.log('[Setup 5] Creating Raw Ingredients (Teh, Gula, Cup)...');
    const createIng = async (name, unit_id, min_stock, cost) => {
      const res = await fetch(`${BASE_URL}/ingredients`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, unit_id, minimum_stock: min_stock, cost_per_unit: cost })
      });
      const data = await res.json();
      return data.data.id;
    };
    const ingTehId = await createIng(`Daun Teh Melati ${timestamp}`, unitGramId, 100, 50);
    const ingGulaId = await createIng(`Gula Pasir Alami ${timestamp}`, unitGramId, 500, 15);
    const ingCupId = await createIng(`Cup 22oz Jumbo ${timestamp}`, unitPcsId, 50, 500);

    console.log('[Setup 6] Performing Initial Stock In for Outlet 1...');
    // Daun Teh: 500g, Gula: 2000g, Cup: 100 pcs
    const stockIn = async (ingId, qty) => {
      await fetch(`${BASE_URL}/inventory/stock-in`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          outlet_id: outlet1Id,
          ingredient_id: ingId,
          quantity: qty,
          reference_type: 'INITIAL_STOCK',
          notes: 'Restock initial inventory'
        })
      });
    };
    await stockIn(ingTehId, 500);
    await stockIn(ingGulaId, 2000);
    await stockIn(ingCupId, 100);
    console.log('✅ Stock In: 500g Teh, 2000g Gula, 100 Cup in Outlet 1');

    console.log('[Setup 7] Creating Product (Es Teh Manis) with Variants & Modifier...');
    // Create Modifier
    const modRes = await fetch(`${BASE_URL}/modifiers`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Topping ${timestamp}`,
        options: [
          { name: 'Extra Boba', price_adjustment: 3000 },
          { name: 'Grass Jelly', price_adjustment: 2000 }
        ]
      })
    });
    const modData = await modRes.json();
    const modifierId = modData.data.id;
    const bobaOptionId = modData.data.options.find(o => o.name === 'Extra Boba').id;

    // Create Product with 2 Variants: Regular (5000) & Jumbo (7000)
    const prodRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `Es Teh Manis Nusantara ${timestamp}`,
        selling_price: 5000,
        track_stock: true,
        modifier_ids: [modifierId],
        variants: [
          { name: 'Regular', selling_price: 5000, is_default: true },
          { name: 'Jumbo', selling_price: 7000, is_default: false }
        ]
      })
    });
    const prodData = await prodRes.json();
    const productId = prodData.data.id;
    const variantRegular = prodData.data.variants.find(v => v.name === 'Regular');
    const variantJumbo = prodData.data.variants.find(v => v.name === 'Jumbo');
    console.log(`✅ Product created: ID ${productId}, Variants: Regular (${variantRegular.id}), Jumbo (${variantJumbo.id})`);

    console.log('[Setup 8] Creating Recipes for Variants...');
    // Recipe Regular: 5g Teh, 25g Gula, 1 Cup
    await fetch(`${BASE_URL}/recipes`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        product_variant_id: variantRegular.id,
        items: [
          { ingredient_id: ingTehId, quantity: 5 },
          { ingredient_id: ingGulaId, quantity: 25 },
          { ingredient_id: ingCupId, quantity: 1 }
        ]
      })
    });

    // Recipe Jumbo: 8g Teh, 40g Gula, 1 Cup
    await fetch(`${BASE_URL}/recipes`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        product_variant_id: variantJumbo.id,
        items: [
          { ingredient_id: ingTehId, quantity: 8 },
          { ingredient_id: ingGulaId, quantity: 40 },
          { ingredient_id: ingCupId, quantity: 1 }
        ]
      })
    });
    console.log('✅ Recipes created for Regular and Jumbo variants');

    // ==============================================================
    // TEST 1: CREATE TRANSACTION & VERIFY BACKEND PRICE CALCULATION
    // ==============================================================
    console.log('\n--- [TEST 1 & 2 & 3] Create Transaction with CASH Payment & Backend Price Verification ---');
    // Order: 2x Es Teh Jumbo (7000) + Extra Boba (3000) -> Unit Price 10000 -> Subtotal 20000
    // Payload intentionally sends bogus client total (1000) to test that backend ignores it!
    const tx1Res = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBudi}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        outlet_id: outlet1Id,
        items: [
          {
            product_id: productId,
            variant_id: variantJumbo.id,
            quantity: 2,
            modifiers: [{ modifier_option_id: bobaOptionId }]
          }
        ],
        discount: 0,
        tax: 0,
        subtotal: 1000, // Fake client subtotal
        total: 1000,    // Fake client total
        payment: {
          method: 'CASH',
          paid_amount: 25000
        }
      })
    });
    const tx1Data = await tx1Res.json();
    console.log('Create Transaction status:', tx1Res.status);
    console.log('Transaction Invoice:', tx1Data.data?.invoice_number);
    console.log('Calculated Subtotal:', tx1Data.data?.subtotal, 'Total:', tx1Data.data?.total);
    console.log('Payment Paid:', tx1Data.data?.payment?.paid_amount, 'Change:', tx1Data.data?.payment?.change_amount);

    if (
      tx1Res.status === 201 &&
      Number(tx1Data.data.subtotal) === 20000 &&
      Number(tx1Data.data.total) === 20000 &&
      Number(tx1Data.data.payment.change_amount) === 5000 &&
      tx1Data.data.invoice_number.startsWith('INV-')
    ) {
      console.log('✅ PASS: Transaction created with exact server-side price calculation & change computation');
    } else {
      throw new Error(`Test 1 Failed: unexpected transaction data: ${JSON.stringify(tx1Data)}`);
    }

    const tx1Id = tx1Data.data.id;

    // ==============================================================
    // TEST 4: INSUFFICIENT CASH PAYMENT REJECTION
    // ==============================================================
    console.log('\n--- [TEST 4] Insufficient CASH Payment Rejection ---');
    const txUnderpaidRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBudi}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        outlet_id: outlet1Id,
        items: [
          {
            product_id: productId,
            variant_id: variantRegular.id,
            quantity: 1
          }
        ],
        payment: {
          method: 'CASH',
          paid_amount: 3000 // Total is 5000 -> insufficient!
        }
      })
    });
    const txUnderpaidData = await txUnderpaidRes.json();
    console.log('Underpaid Tx Status:', txUnderpaidRes.status, 'Message:', txUnderpaidData.message);

    if (txUnderpaidRes.status === 400 && txUnderpaidData.message.includes('Insufficient payment')) {
      console.log('✅ PASS: Insufficient payment correctly rejected with 400 Bad Request');
    } else {
      throw new Error('Test 4 Failed: Expected 400 Insufficient payment error');
    }

    // ==============================================================
    // TEST 5: AUTOMATIC INVENTORY DEDUCTION VERIFICATION
    // ==============================================================
    console.log('\n--- [TEST 5] Recipe-Based Automatic Inventory Deduction Verification ---');
    // For 2x Jumbo:
    // Teh: 2 * 8g = 16g deducted (500 - 16 = 484)
    // Gula: 2 * 40g = 80g deducted (2000 - 80 = 1920)
    // Cup: 2 * 1 = 2 pcs deducted (100 - 2 = 98)
    const stockRes = await fetch(`${BASE_URL}/inventory/stock?outlet_id=${outlet1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const stockData = await stockRes.json();
    const stockItems = stockData.data.items;

    const stockTeh = stockItems.find(i => i.ingredient_id === ingTehId)?.current_stock;
    const stockGula = stockItems.find(i => i.ingredient_id === ingGulaId)?.current_stock;
    const stockCup = stockItems.find(i => i.ingredient_id === ingCupId)?.current_stock;

    console.log(`Current Stock in Outlet 1 -> Teh: ${stockTeh}g (exp: 484), Gula: ${stockGula}g (exp: 1920), Cup: ${stockCup} (exp: 98)`);

    if (stockTeh === 484 && stockGula === 1920 && stockCup === 98) {
      console.log('✅ PASS: Inventory deducted accurately according to recipe formula');
    } else {
      throw new Error(`Test 5 Failed: Stock deduction mismatch: Teh=${stockTeh}, Gula=${stockGula}, Cup=${stockCup}`);
    }

    // ==============================================================
    // TEST 6: INSUFFICIENT STOCK REJECTION
    // ==============================================================
    console.log('\n--- [TEST 6] Insufficient Stock Rejection ---');
    // Available Cup is 98. Attempt to purchase 150 Cups (150x Regular):
    const txOverstockRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBudi}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        outlet_id: outlet1Id,
        items: [
          {
            product_id: productId,
            variant_id: variantRegular.id,
            quantity: 150
          }
        ],
        payment: {
          method: 'CASH',
          paid_amount: 1000000
        }
      })
    });
    const txOverstockData = await txOverstockRes.json();
    console.log('Overstock Tx Status:', txOverstockRes.status, 'Message:', txOverstockData.message);

    if (txOverstockRes.status === 400 && txOverstockData.message.includes('Insufficient stock')) {
      console.log('✅ PASS: Insufficient stock correctly rejected');
    } else {
      throw new Error(`Test 6 Failed: Expected 400 Insufficient stock, got ${txOverstockRes.status}`);
    }

    // ==============================================================
    // TEST 7: TRANSACTION CANCELLATION & AUTOMATIC INVENTORY REVERSAL
    // ==============================================================
    console.log('\n--- [TEST 7] Transaction Cancellation & Inventory Reversal ---');
    const cancelRes = await fetch(`${BASE_URL}/transactions/${tx1Id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Customer changed mind' })
    });
    const cancelData = await cancelRes.json();
    console.log('Cancel Status:', cancelRes.status, 'Tx Status:', cancelData.data?.transaction_status, 'Payment Status:', cancelData.data?.payment_status);

    if (cancelRes.status === 200 && cancelData.data.transaction_status === 'CANCELLED' && cancelData.data.payment_status === 'REFUNDED') {
      console.log('✅ PASS: Transaction successfully cancelled');
    } else {
      throw new Error(`Test 7 Failed: Cancel transaction failed: ${JSON.stringify(cancelData)}`);
    }

    // Verify Stock Reversal: Stock must be restored to 500, 2000, 100
    const stockAfterCancelRes = await fetch(`${BASE_URL}/inventory/stock?outlet_id=${outlet1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const stockAfterCancelData = await stockAfterCancelRes.json();
    const stockAfterItems = stockAfterCancelData.data.items;

    const restoredTeh = stockAfterItems.find(i => i.ingredient_id === ingTehId)?.current_stock;
    const restoredGula = stockAfterItems.find(i => i.ingredient_id === ingGulaId)?.current_stock;
    const restoredCup = stockAfterItems.find(i => i.ingredient_id === ingCupId)?.current_stock;

    console.log(`Stock After Cancel -> Teh: ${restoredTeh}g (exp: 500), Gula: ${restoredGula}g (exp: 2000), Cup: ${restoredCup} (exp: 100)`);

    if (restoredTeh === 500 && restoredGula === 2000 && restoredCup === 100) {
      console.log('✅ PASS: Inventory fully restored upon transaction cancellation');
    } else {
      throw new Error(`Test 7 Failed: Stock restoration mismatch: Teh=${restoredTeh}, Gula=${restoredGula}, Cup=${restoredCup}`);
    }

    // ==============================================================
    // TEST 8: MULTI-TENANT ISOLATION
    // ==============================================================
    console.log('\n--- [TEST 8] Multi-Tenant Isolation ---');
    const tenantBreachRes = await fetch(`${BASE_URL}/transactions/${tx1Id}`, {
      headers: { 'Authorization': `Bearer ${tokenB}`, 'x-business-id': businessBId }
    });
    console.log('Business B access Business A Tx Status:', tenantBreachRes.status);
    if (tenantBreachRes.status === 404) {
      console.log('✅ PASS: Business B cannot access Business A transaction (404 Not Found)');
    } else {
      throw new Error(`Test 8 Failed: Expected 404, got ${tenantBreachRes.status}`);
    }

    // ==============================================================
    // TEST 9: OUTLET ACCESS SCOPING
    // ==============================================================
    console.log('\n--- [TEST 9] Outlet Access Scoping ---');
    // Kasir Budi is NOT assigned to Outlet 2. Budi tries to make a transaction in Outlet 2:
    const outletBreachRes = await fetch(`${BASE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBudi}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        outlet_id: outlet2Id,
        items: [{ product_id: productId, variant_id: variantRegular.id, quantity: 1 }],
        payment: { method: 'CASH', paid_amount: 10000 }
      })
    });
    console.log('Budi access Outlet 2 Status:', outletBreachRes.status);
    if (outletBreachRes.status === 403) {
      console.log('✅ PASS: User cannot access unauthorized outlet (403 Forbidden)');
    } else {
      throw new Error(`Test 9 Failed: Expected 403, got ${outletBreachRes.status}`);
    }

    // ==============================================================
    // TEST 10: PERMISSION ENFORCEMENT (sales.cancel)
    // ==============================================================
    console.log('\n--- [TEST 10] Permission Enforcement (sales.cancel) ---');
    // Kasir Budi has Cashier role (no sales.cancel permission). Budi tries to cancel tx1:
    const budiCancelRes = await fetch(`${BASE_URL}/transactions/${tx1Id}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenBudi}`,
        'x-business-id': businessAId,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ reason: 'Kasir tries to cancel' })
    });
    console.log('Kasir Budi Cancel Status:', budiCancelRes.status);
    if (budiCancelRes.status === 403) {
      console.log('✅ PASS: User without sales.cancel permission is rejected (403 Forbidden)');
    } else {
      throw new Error(`Test 10 Failed: Expected 403, got ${budiCancelRes.status}`);
    }

    // ==============================================================
    // TEST 11: LIST TRANSACTIONS WITH FILTERS
    // ==============================================================
    console.log('\n--- [TEST 11] List Transactions with Filters ---');
    const listRes = await fetch(`${BASE_URL}/transactions?status=CANCELLED`, {
      headers: { 'Authorization': `Bearer ${tokenA}`, 'x-business-id': businessAId }
    });
    const listData = await listRes.json();
    console.log('List Transactions count:', listData.data?.length);

    if (listRes.status === 200 && listData.data.length >= 1) {
      console.log('✅ PASS: Filtered transactions listed successfully');
    } else {
      throw new Error(`Test 11 Failed: Transaction list query failed: ${JSON.stringify(listData)}`);
    }

    console.log('\n====================================================');
    console.log('🎉 ALL PHASE 7 INTEGRATION TESTS PASSED (100% GREEN)');
    console.log('====================================================\n');

  } finally {
    server.close();
  }
};

if (require.main === module) {
  runPosTransactionTests().catch(err => {
    console.error('❌ Integration Test Suite Failed:', err);
    process.exit(1);
  });
}

module.exports = runPosTransactionTests;
