const app = require('../app');
const { testConnection, sequelize } = require('../config/database');

const runProductManagementTests = async () => {
  console.log('====================================================');
  console.log('🧪 RUNNING PHASE 5 — PRODUCT MANAGEMENT INTEGRATION TESTS');
  console.log('====================================================\n');

  await testConnection();

  const TEST_PORT = 5059;
  const server = app.listen(TEST_PORT);
  const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

  try {
    const timestamp = Date.now();

    // ==============================================================
    // SETUP: BUSINESS A (KEBAB) & BUSINESS B (ES TEH)
    // ==============================================================
    console.log('[Setup 1] Registering Business A Owner (Kebab Baba)...');
    const ownerAEmail = `owner_kebab_${timestamp}@example.com`;
    const regARes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Juragan Kebab',
        email: ownerAEmail,
        phone: `0811${timestamp.toString().slice(-8)}`,
        password: 'PasswordA123!',
        business_name: 'Kebab Baba Makmur'
      })
    });
    const regAData = await regARes.json();
    const tokenA = regAData.data.tokens.access_token;
    const businessAId = regAData.data.business.id;
    console.log(`✅ Business A created: ID ${businessAId}`);

    console.log('\n[Setup 2] Registering Business B Owner (Es Teh Solo)...');
    const ownerBEmail = `owner_esteh_${timestamp}@example.com`;
    const regBRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Juragan Es Teh',
        email: ownerBEmail,
        phone: `0822${timestamp.toString().slice(-8)}`,
        password: 'PasswordB123!',
        business_name: 'Es Teh Solo Segar'
      })
    });
    const regBData = await regBRes.json();
    const tokenB = regBData.data.tokens.access_token;
    const businessBId = regBData.data.business.id;
    console.log(`✅ Business B created: ID ${businessBId}`);

    console.log('\n[Setup 3] Registering Cashier User in Business A (No Product Management Permissions)...');
    const cashierEmail = `cashier_${timestamp}@example.com`;
    const regCashierRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Kasir Andi',
        email: cashierEmail,
        phone: `0833${timestamp.toString().slice(-8)}`,
        password: 'PasswordCashier123!',
        business_name: 'Andi Personal'
      })
    });
    const regCashierData = await regCashierRes.json();
    const cashierToken = regCashierData.data.tokens.access_token;
    const cashierUserId = regCashierData.data.user.id;

    // Fetch Cashier role in Business A
    const { Role } = require('../models');
    const cashierRoleA = await Role.findOne({
      where: { business_id: businessAId, name: 'Cashier' }
    });

    // Add Cashier to Business A
    await fetch(`${BASE_URL}/business/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        email: cashierEmail,
        role_id: cashierRoleA.id,
        outlet_ids: [regAData.data.outlet.id]
      })
    });
    console.log(`✅ Kasir Andi added to Business A as Cashier`);

    // ==============================================================
    // TEST 1: OWNER A CREATES CATEGORIES
    // ==============================================================
    console.log('\n[Test 1] Owner A creates Category "Makanan Berat" & "Minuman" in Business A...');
    const createCatRes = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Makanan Berat',
        description: 'Menu utama aneka kebab dan roti bakar'
      })
    });
    const createCatData = await createCatRes.json();
    if (createCatRes.status !== 201) throw new Error(`Create Category failed: ${JSON.stringify(createCatData)}`);
    const categoryAId = createCatData.data.id;
    console.log(`✅ Category "Makanan Berat" created: ID ${categoryAId}`);

    // Create Category in Business B
    const createCatBRes = await fetch(`${BASE_URL}/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
        'X-Business-Id': businessBId.toString()
      },
      body: JSON.stringify({
        name: 'Minuman Segar',
        description: 'Aneka es teh dan kopi'
      })
    });
    const createCatBData = await createCatBRes.json();
    const categoryBId = createCatBData.data.id;
    console.log(`✅ Category "Minuman Segar" created in Business B: ID ${categoryBId}`);

    // ==============================================================
    // TEST 2: OWNER A CREATES PRODUCT
    // ==============================================================
    console.log('\n[Test 2] Owner A creates Product "Kebab Beef Original" in Business A...');
    const createProdRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Kebab Beef Original',
        category_id: categoryAId,
        sku: 'KBB-BEEF-01',
        description: 'Kebab daging sapi panggang dengan sayuran segar',
        cost_price: 10000.00,
        selling_price: 18000.00,
        track_stock: true
      })
    });
    const createProdData = await createProdRes.json();
    if (createProdRes.status !== 201) throw new Error(`Create Product failed: ${JSON.stringify(createProdData)}`);
    const productAId = createProdData.data.id;
    console.log(`✅ Product "Kebab Beef Original" created: ID ${productAId}, Selling Price: Rp 18.000`);

    // ==============================================================
    // TEST 3: OWNER A CREATES PRODUCT VARIANTS
    // ==============================================================
    console.log('\n[Test 3] Owner A creates Variants: "Small", "Medium", "Large"...');
    
    // Variant 1: Small
    const var1Res = await fetch(`${BASE_URL}/products/${productAId}/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Small',
        sku: 'KBB-BEEF-S',
        cost_price: 8000.00,
        selling_price: 15000.00,
        is_default: false
      })
    });
    const var1Data = await var1Res.json();
    const var1Id = var1Data.data.id;

    // Variant 2: Medium (Default)
    const var2Res = await fetch(`${BASE_URL}/products/${productAId}/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Medium',
        sku: 'KBB-BEEF-M',
        cost_price: 10000.00,
        selling_price: 18000.00,
        is_default: true
      })
    });
    const var2Data = await var2Res.json();
    const var2Id = var2Data.data.id;

    // Variant 3: Large
    const var3Res = await fetch(`${BASE_URL}/products/${productAId}/variants`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Large',
        sku: 'KBB-BEEF-L',
        cost_price: 13000.00,
        selling_price: 24000.00,
        is_default: false
      })
    });
    const var3Data = await var3Res.json();
    const var3Id = var3Data.data.id;
    console.log(`✅ 3 Variants created for Kebab Beef: Small (Rp 15.000), Medium (Rp 18.000), Large (Rp 24.000)`);

    // ==============================================================
    // TEST 4: OWNER A CREATES MODIFIER & OPTIONS
    // ==============================================================
    console.log('\n[Test 4] Owner A creates Modifier "Extra Topping" with Options (Cheese, Egg, Extra Meat)...');
    const createModRes = await fetch(`${BASE_URL}/modifiers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Extra Topping',
        type: 'MULTIPLE',
        is_required: false,
        min_selection: 0,
        max_selection: 3,
        options: [
          { name: 'Extra Cheese', price_adjustment: 3000.00, is_default: false },
          { name: 'Telur Mata Sapi', price_adjustment: 4000.00, is_default: false },
          { name: 'Extra Daging Kebab', price_adjustment: 6000.00, is_default: false }
        ]
      })
    });
    const createModData = await createModRes.json();
    if (createModRes.status !== 201) throw new Error(`Create Modifier failed: ${JSON.stringify(createModData)}`);
    const modifierAId = createModData.data.id;
    console.log(`✅ Modifier "Extra Topping" created: ID ${modifierAId} with 3 Options`);

    // ==============================================================
    // TEST 5: OWNER A ATTACHES MODIFIER TO PRODUCT
    // ==============================================================
    console.log('\n[Test 5] Attaching Modifier "Extra Topping" to "Kebab Beef Original"...');
    const attachRes = await fetch(`${BASE_URL}/products/${productAId}/modifiers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        modifier_id: modifierAId
      })
    });
    const attachData = await attachRes.json();
    if (attachRes.status !== 200) throw new Error(`Attach Modifier failed: ${JSON.stringify(attachData)}`);
    console.log('✅ Modifier attached to Product successfully. Verifying full product graph...');

    // Fetch Product Detail to verify graph
    const getProdRes = await fetch(`${BASE_URL}/products/${productAId}`, {
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    const getProdData = await getProdRes.json();
    if (getProdData.data.variants.length !== 3 || getProdData.data.modifiers.length !== 1) {
      throw new Error(`Product graph incomplete: ${JSON.stringify(getProdData)}`);
    }
    console.log(`✅ Full Product Graph Verified: ${getProdData.data.name} has ${getProdData.data.variants.length} variants and ${getProdData.data.modifiers[0].options.length} modifier options`);

    // ==============================================================
    // TEST 6: USER WITHOUT product.create IS REJECTED (403 FORBIDDEN)
    // ==============================================================
    console.log('\n[Test 6] 🔒 Security Test: Cashier attempts to create a product (POST /products)...');
    const cashierCreateProdRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cashierToken}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Unauthorized Product',
        selling_price: 10000
      })
    });
    const cashierCreateProdData = await cashierCreateProdRes.json();
    console.log(`Cashier create product status: ${cashierCreateProdRes.status} (Expected: 403)`);
    if (cashierCreateProdRes.status !== 403 || cashierCreateProdData.error_code !== 'INSUFFICIENT_PERMISSIONS') {
      throw new Error(`SECURITY FAILURE: Cashier was able to create product! Response: ${JSON.stringify(cashierCreateProdData)}`);
    }
    console.log('✅ PASS: Cashier blocked with 403 Forbidden (INSUFFICIENT_PERMISSIONS)');

    // ==============================================================
    // TEST 7: USER WITHOUT product.update IS REJECTED (403 FORBIDDEN)
    // ==============================================================
    console.log('\n[Test 7] 🔒 Security Test: Cashier attempts to update a product (PUT /products/:id)...');
    const cashierUpdateProdRes = await fetch(`${BASE_URL}/products/${productAId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cashierToken}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Hacked Kebab Name'
      })
    });
    const cashierUpdateProdData = await cashierUpdateProdRes.json();
    console.log(`Cashier update product status: ${cashierUpdateProdRes.status} (Expected: 403)`);
    if (cashierUpdateProdRes.status !== 403 || cashierUpdateProdData.error_code !== 'INSUFFICIENT_PERMISSIONS') {
      throw new Error(`SECURITY FAILURE: Cashier was able to update product! Response: ${JSON.stringify(cashierUpdateProdData)}`);
    }
    console.log('✅ PASS: Cashier blocked with 403 Forbidden (INSUFFICIENT_PERMISSIONS)');

    // ==============================================================
    // TEST 8: BUSINESS A CANNOT READ PRODUCT OF BUSINESS B
    // ==============================================================
    console.log('\n[Test 8] 🔒 Multi-Tenant Test: Owner B creates Product B, Owner A attempts to read Product B...');
    
    // Create Product in Business B
    const createProdBRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
        'X-Business-Id': businessBId.toString()
      },
      body: JSON.stringify({
        name: 'Es Teh Jumbo Melati',
        category_id: categoryBId,
        selling_price: 5000.00
      })
    });
    const createProdBData = await createProdBRes.json();
    const productBId = createProdBData.data.id;
    console.log(`Business B created Product ID: ${productBId}`);

    // Owner A attempts to access Product B
    const leakProdRes = await fetch(`${BASE_URL}/products/${productBId}`, {
      headers: {
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      }
    });
    const leakProdData = await leakProdRes.json();
    console.log(`Owner A -> Product B status: ${leakProdRes.status} (Expected: 404)`);
    if (leakProdRes.status !== 404 || leakProdData.error_code !== 'PRODUCT_NOT_FOUND') {
      throw new Error(`MULTI-TENANT LEAK: Owner A accessed Product B! Response: ${JSON.stringify(leakProdData)}`);
    }
    console.log('✅ PASS: Owner A cannot see Product B (404 Not Found)');

    // ==============================================================
    // TEST 9: BUSINESS A CANNOT USE CATEGORY OF BUSINESS B
    // ==============================================================
    console.log('\n[Test 9] 🔒 Multi-Tenant Test: Owner A tries to create product with Business B category...');
    const crossCatRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Invalid Cross Category Product',
        category_id: categoryBId, // Category belongs to Business B!
        selling_price: 12000.00
      })
    });
    const crossCatData = await crossCatRes.json();
    console.log(`Cross-category create status: ${crossCatRes.status} (Expected: 400)`);
    if (crossCatRes.status !== 400 || crossCatData.error_code !== 'INVALID_CATEGORY') {
      throw new Error(`MULTI-TENANT LEAK: Business A used Business B category! Response: ${JSON.stringify(crossCatData)}`);
    }
    console.log('✅ PASS: Cross-tenant category usage rejected (400 Bad Request - INVALID_CATEGORY)');

    // ==============================================================
    // TEST 10: VARIANT OF BUSINESS A CANNOT BE ACCESSED VIA PRODUCT B
    // ==============================================================
    console.log('\n[Test 10] 🔒 Nested Multi-Tenant Test: Accessing Variant of Product A via Product B...');
    const crossVarRes = await fetch(`${BASE_URL}/products/${productBId}/variants/${var1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
        'X-Business-Id': businessBId.toString()
      },
      body: JSON.stringify({
        selling_price: 99999.00
      })
    });
    const crossVarData = await crossVarRes.json();
    console.log(`Cross-variant access status: ${crossVarRes.status} (Expected: 404)`);
    if (crossVarRes.status !== 404) {
      throw new Error(`SECURITY LEAK: Cross-product variant mutation allowed! Response: ${JSON.stringify(crossVarData)}`);
    }
    console.log('✅ PASS: Nested cross-product variant access rejected (404 Not Found - VARIANT_NOT_FOUND)');

    // ==============================================================
    // TEST 11: MODIFIER OF BUSINESS A CANNOT BE ATTACHED TO PRODUCT B
    // ==============================================================
    console.log('\n[Test 11] 🔒 Multi-Tenant Test: Owner B attempts to attach Modifier A to Product B...');
    const crossModRes = await fetch(`${BASE_URL}/products/${productBId}/modifiers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenB}`,
        'X-Business-Id': businessBId.toString()
      },
      body: JSON.stringify({
        modifier_id: modifierAId // Modifier belongs to Business A!
      })
    });
    const crossModData = await crossModRes.json();
    console.log(`Cross-modifier attach status: ${crossModRes.status} (Expected: 404)`);
    if (crossModRes.status !== 404 || crossModData.error_code !== 'MODIFIER_NOT_FOUND') {
      throw new Error(`MULTI-TENANT LEAK: Business B attached Modifier of Business A! Response: ${JSON.stringify(crossModData)}`);
    }
    console.log('✅ PASS: Cross-tenant modifier attachment rejected (404 Not Found - MODIFIER_NOT_FOUND)');

    // ==============================================================
    // TEST 12: DUPLICATE SKU IN SAME BUSINESS IS REJECTED (409 CONFLICT)
    // ==============================================================
    console.log('\n[Test 12] 🔒 Integrity Test: Creating Product with duplicate SKU "KBB-BEEF-01"...');
    const dupSkuRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenA}`,
        'X-Business-Id': businessAId.toString()
      },
      body: JSON.stringify({
        name: 'Kebab Beef Duplicate SKU',
        sku: 'KBB-BEEF-01',
        selling_price: 20000.00
      })
    });
    const dupSkuData = await dupSkuRes.json();
    console.log(`Duplicate SKU create status: ${dupSkuRes.status} (Expected: 409)`);
    if (dupSkuRes.status !== 409 || dupSkuData.error_code !== 'SKU_ALREADY_EXISTS') {
      throw new Error(`INTEGRITY FAILURE: Duplicate SKU was accepted! Response: ${JSON.stringify(dupSkuData)}`);
    }
    console.log('✅ PASS: Duplicate SKU rejected with 409 Conflict (SKU_ALREADY_EXISTS)');

    console.log('\n====================================================');
    console.log('🎉 ALL 12 PRODUCT MANAGEMENT INTEGRATION TESTS PASSED 100%!');
    console.log('====================================================\n');

  } finally {
    server.close();
    await sequelize.close();
  }
};

runProductManagementTests().catch(err => {
  console.error('\n❌ PRODUCT MANAGEMENT TEST FAILED:', err);
  process.exit(1);
});
