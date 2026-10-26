'use strict';
require('dotenv').config();
const {
  Business,
  Outlet,
  User,
  Category,
  Unit,
  Ingredient,
  Product,
  Recipe,
  RecipeItem,
  StockMovement,
  sequelize
} = require('../models');

/**
 * UsahaKu - Seeder Data Dummy (Menu Produk, Bahan Baku, Resep & Stok Awal)
 * Cocok untuk bisnis F&B (Es Teh, Kopi kekinian, dan Makanan/Snack)
 */
async function seedDummyData(targetBusinessId = null) {
  console.log('====================================================');
  console.log('🌱 MEMULAI SEEDER DUMMY: MENU, BAHAN BAKU & RESEP');
  console.log('====================================================\n');

  // 1. Tentukan Business target
  let business;
  if (targetBusinessId) {
    business = await Business.findByPk(targetBusinessId);
  } else {
    business = await Business.findOne({ where: { is_active: true }, order: [['id', 'ASC']] });
  }

  if (!business) {
    console.error('❌ Tidak ditemukan bisnis aktif di database.');
    console.error('   Silakan jalankan "npm run seed:dev" atau registrasi akun terlebih dahulu.');
    return;
  }

  const businessId = business.id;
  console.log(`📌 Menambahkan data untuk Bisnis: [ID: ${businessId}] ${business.name}`);

  // 2. Ambil Outlet utama untuk stok awal
  const outlet = await Outlet.findOne({
    where: { business_id: businessId, is_active: true },
    order: [['id', 'ASC']]
  });

  const outletId = outlet ? outlet.id : null;
  if (outlet) {
    console.log(`📌 Outlet Terdeteksi: [ID: ${outlet.id}] ${outlet.name}`);
  } else {
    console.log('⚠️ Tidak ditemukan outlet aktif. Stok awal tidak akan dicatat.');
  }

  // 3. Ambil User pembuat (creator)
  const user = await User.findByPk(business.owner_id);
  const userId = user ? user.id : 1;

  const transaction = await sequelize.transaction();

  try {
    const now = new Date();

    // ----------------------------------------------------
    // A. PASTIKAN SATUAN UKURAN (UNITS) LENGKAP
    // ----------------------------------------------------
    console.log('\n[1/5] Memeriksa & Mengisi Satuan Ukuran (Units)...');
    const standardUnits = [
      { name: 'Gram', symbol: 'gr' },
      { name: 'Milliliter', symbol: 'ml' },
      { name: 'Pieces', symbol: 'pcs' },
      { name: 'Kilogram', symbol: 'kg' },
      { name: 'Liter', symbol: 'L' },
      { name: 'Cup', symbol: 'cup' },
      { name: 'Sachet', symbol: 'sct' },
      { name: 'Porsi', symbol: 'prs' }
    ];

    const unitMap = {};
    for (const u of standardUnits) {
      let existing = await Unit.findOne({
        where: { business_id: businessId, name: u.name },
        transaction
      });
      if (!existing) {
        existing = await Unit.create({
          business_id: businessId,
          name: u.name,
          symbol: u.symbol,
          is_active: true
        }, { transaction });
      }
      unitMap[u.name.toLowerCase()] = existing.id;
      unitMap[u.symbol.toLowerCase()] = existing.id;
    }
    console.log('✅ Satuan Ukuran siap (gr, ml, pcs, kg, L, cup, sct, prs).');

    // ----------------------------------------------------
    // B. KATEGORI MENU PRODUK
    // ----------------------------------------------------
    console.log('\n[2/5] Menyiapkan Kategori Menu...');
    const categoryData = [
      { name: 'Minuman Es Teh', description: 'Varian es teh segar nusantara dan teh rasa buah' },
      { name: 'Minuman Kopi & Susu', description: 'Kopi kekinian dan aneka olahan susu creamy' },
      { name: 'Makanan Ringan / Snack', description: 'Camilan garing dan lezat teman minum teh' },
      { name: 'Makanan Utama', description: 'Menu porsi kenyang praktis rice bowl & lauk' }
    ];

    const categoryMap = {};
    for (const cat of categoryData) {
      let [c] = await Category.findOrCreate({
        where: { business_id: businessId, name: cat.name },
        defaults: {
          business_id: businessId,
          name: cat.name,
          description: cat.description,
          is_active: true
        },
        transaction
      });
      categoryMap[cat.name] = c.id;
    }
    console.log('✅ Kategori siap:', Object.keys(categoryMap).join(', '));

    // ----------------------------------------------------
    // C. BAHAN BAKU (INGREDIENTS)
    // ----------------------------------------------------
    console.log('\n[3/5] Menyiapkan Bahan Baku (Ingredients)...');
    const ingredientList = [
      { name: 'Daun Teh Melati (Tubruk)', unit: 'gr', sku: 'ING-TEH-01', min: 1000, cost: 35.0, initialStock: 10000 },
      { name: 'Gula Pasir Kristal', unit: 'gr', sku: 'ING-GLA-01', min: 2000, cost: 17.5, initialStock: 25000 },
      { name: 'Susu UHT Plain Full Cream', unit: 'ml', sku: 'ING-SSU-01', min: 2000, cost: 19.0, initialStock: 20000 },
      { name: 'Susu Kental Manis (SKM)', unit: 'ml', sku: 'ING-SKM-01', min: 1000, cost: 30.0, initialStock: 10000 },
      { name: 'Sirup Sari Lemon Segar', unit: 'ml', sku: 'ING-SRP-01', min: 1000, cost: 50.0, initialStock: 5000 },
      { name: 'Sirup Leci Premium', unit: 'ml', sku: 'ING-SRP-02', min: 1000, cost: 60.0, initialStock: 5000 },
      { name: 'Sirup Gula Aren Asli', unit: 'ml', sku: 'ING-SRP-03', min: 1000, cost: 45.0, initialStock: 5000 },
      { name: 'Bubuk Kopi Robusta Blend', unit: 'gr', sku: 'ING-KPI-01', min: 1000, cost: 90.0, initialStock: 5000 },
      { name: 'Es Batu Kristal', unit: 'gr', sku: 'ING-ICE-01', min: 5000, cost: 1.5, initialStock: 50000 },
      { name: 'Cup Plastik Jumbo 22oz', unit: 'pcs', sku: 'ING-CUP-22', min: 100, cost: 450.0, initialStock: 500 },
      { name: 'Cup Plastik Reguler 16oz', unit: 'pcs', sku: 'ING-CUP-16', min: 100, cost: 350.0, initialStock: 500 },
      { name: 'Tutup Lid & Sedotan Higienis', unit: 'pcs', sku: 'ING-LID-01', min: 200, cost: 150.0, initialStock: 1000 },
      { name: 'Kantong Plastik Kresek 1 Cup', unit: 'pcs', sku: 'ING-PLT-01', min: 200, cost: 100.0, initialStock: 1000 },
      { name: 'Kentang Beku Shoestring', unit: 'gr', sku: 'ING-KTG-01', min: 2000, cost: 36.0, initialStock: 10000 },
      { name: 'Sosis Sapi Jumbo', unit: 'pcs', sku: 'ING-SSS-01', min: 50, cost: 2500.0, initialStock: 200 },
      { name: 'Minyak Goreng Sawit', unit: 'ml', sku: 'ING-MYK-01', min: 2000, cost: 16.0, initialStock: 20000 },
      { name: 'Bumbu Tabur Barbeque', unit: 'gr', sku: 'ING-BMB-01', min: 500, cost: 50.0, initialStock: 2000 },
      { name: 'Saus Sambal Sachet', unit: 'sct', sku: 'ING-SAU-01', min: 100, cost: 300.0, initialStock: 500 },
      { name: 'Kemasan Box Snack Kraft', unit: 'pcs', sku: 'ING-KMS-01', min: 100, cost: 500.0, initialStock: 300 },
      { name: 'Beras Putih Premium', unit: 'gr', sku: 'ING-BRS-01', min: 5000, cost: 14.0, initialStock: 20000 },
      { name: 'Daging Ayam Fillet Segar', unit: 'gr', sku: 'ING-AYM-01', min: 2000, cost: 45.0, initialStock: 10000 }
    ];

    const ingredientMap = {};
    for (const ing of ingredientList) {
      const uId = unitMap[ing.unit.toLowerCase()] || unitMap['pcs'];
      let existing = await Ingredient.findOne({
        where: { business_id: businessId, name: ing.name },
        transaction
      });

      if (!existing) {
        existing = await Ingredient.create({
          business_id: businessId,
          unit_id: uId,
          name: ing.name,
          sku: ing.sku,
          minimum_stock: ing.min,
          cost_per_unit: ing.cost,
          is_active: true
        }, { transaction });
      } else {
        await existing.update({
          unit_id: uId,
          minimum_stock: ing.min,
          cost_per_unit: ing.cost
        }, { transaction });
      }
      ingredientMap[ing.name] = existing;

      // Catat Stok Awal di Outlet (jika belum ada pergerakan stok untuk bahan ini di outlet)
      if (outletId) {
        const movementCount = await StockMovement.count({
          where: {
            business_id: businessId,
            outlet_id: outletId,
            ingredient_id: existing.id
          },
          transaction
        });

        if (movementCount === 0 && ing.initialStock > 0) {
          await StockMovement.create({
            business_id: businessId,
            outlet_id: outletId,
            ingredient_id: existing.id,
            type: 'IN',
            quantity: ing.initialStock,
            reference_type: 'INITIAL_STOCK',
            reference_id: null,
            notes: 'Saldo Awal Seeder Demo',
            created_by: userId
          }, { transaction });
        }
      }
    }
    console.log(`✅ ${ingredientList.length} Bahan Baku dan Stok Awal siap.`);

    // ----------------------------------------------------
    // D. MENU PRODUK & RESEP
    // ----------------------------------------------------
    console.log('\n[4/5] Menyiapkan Menu Produk & Resep Makanan/Minuman...');

    const menuDefinitions = [
      {
        name: 'Es Teh Manis Jumbo (22oz)',
        category: 'Minuman Es Teh',
        sku: 'PRD-TEH-001',
        selling_price: 5000,
        description: 'Es teh manis segar daun melati pilihan ukuran jumbo 22oz',
        instructions: 'Seduh 10gr teh dengan air panas 200ml, larutkan 25gr gula, tuang es batu 250gr ke dalam cup 22oz, seal cup dan sajikan dengan sedotan.',
        items: [
          { name: 'Daun Teh Melati (Tubruk)', qty: 10 },
          { name: 'Gula Pasir Kristal', qty: 25 },
          { name: 'Es Batu Kristal', qty: 250 },
          { name: 'Cup Plastik Jumbo 22oz', qty: 1 },
          { name: 'Tutup Lid & Sedotan Higienis', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      },
      {
        name: 'Es Teh Melati Original (16oz)',
        category: 'Minuman Es Teh',
        sku: 'PRD-TEH-002',
        selling_price: 3500,
        description: 'Es teh wangi melati segar ukuran reguler 16oz',
        instructions: 'Seduh biang teh 8gr, campur 20gr gula pasir, tambahkan es batu 180gr di cup 16oz.',
        items: [
          { name: 'Daun Teh Melati (Tubruk)', qty: 8 },
          { name: 'Gula Pasir Kristal', qty: 20 },
          { name: 'Es Batu Kristal', qty: 180 },
          { name: 'Cup Plastik Reguler 16oz', qty: 1 },
          { name: 'Tutup Lid & Sedotan Higienis', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      },
      {
        name: 'Es Teh Lemon Segar (Lemon Tea)',
        category: 'Minuman Es Teh',
        sku: 'PRD-TEH-003',
        selling_price: 7000,
        description: 'Kombinasi teh melati pekat dengan kesegaran sari lemon alami',
        instructions: 'Campurkan biang teh 8gr, 25ml sirup lemon, 15gr gula, kocok dengan es batu 200gr dalam shaker, tuang ke cup 16oz.',
        items: [
          { name: 'Daun Teh Melati (Tubruk)', qty: 8 },
          { name: 'Sirup Sari Lemon Segar', qty: 25 },
          { name: 'Gula Pasir Kristal', qty: 15 },
          { name: 'Es Batu Kristal', qty: 200 },
          { name: 'Cup Plastik Reguler 16oz', qty: 1 },
          { name: 'Tutup Lid & Sedotan Higienis', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      },
      {
        name: 'Es Teh Susu Nusantara (Milk Tea)',
        category: 'Minuman Es Teh',
        sku: 'PRD-TEH-004',
        selling_price: 8000,
        description: 'Milk tea lembut khas nusantara perpaduan teh wangi dan susu segar',
        instructions: 'Larutkan 20ml SKM dalam biang teh kental 10gr, tuang susu UHT 60ml, beri es batu 180gr.',
        items: [
          { name: 'Daun Teh Melati (Tubruk)', qty: 10 },
          { name: 'Susu UHT Plain Full Cream', qty: 60 },
          { name: 'Susu Kental Manis (SKM)', qty: 20 },
          { name: 'Es Batu Kristal', qty: 180 },
          { name: 'Cup Plastik Reguler 16oz', qty: 1 },
          { name: 'Tutup Lid & Sedotan Higienis', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      },
      {
        name: 'Es Teh Leci (Lychee Tea)',
        category: 'Minuman Es Teh',
        sku: 'PRD-TEH-005',
        selling_price: 8000,
        description: 'Teh melati wangi dengan aroma dan manisnya buah leci',
        instructions: 'Campur 25ml sirup leci, 10gr gula, biang teh 8gr, tambahkan es batu 200gr.',
        items: [
          { name: 'Daun Teh Melati (Tubruk)', qty: 8 },
          { name: 'Sirup Leci Premium', qty: 25 },
          { name: 'Gula Pasir Kristal', qty: 10 },
          { name: 'Es Batu Kristal', qty: 200 },
          { name: 'Cup Plastik Reguler 16oz', qty: 1 },
          { name: 'Tutup Lid & Sedotan Higienis', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      },
      {
        name: 'Kopi Susu Gula Aren',
        category: 'Minuman Kopi & Susu',
        sku: 'PRD-KPI-001',
        selling_price: 12000,
        description: 'Espresso robusta mantap berpadu susu segar dan manis legit gula aren',
        instructions: 'Ekstraksi 18gr kopi, tuang sirup aren 25ml di dasar cup, beri es batu 150gr, tuang susu UHT 100ml, lalu pour kopi di atasnya.',
        items: [
          { name: 'Bubuk Kopi Robusta Blend', qty: 18 },
          { name: 'Susu UHT Plain Full Cream', qty: 100 },
          { name: 'Sirup Gula Aren Asli', qty: 25 },
          { name: 'Es Batu Kristal', qty: 150 },
          { name: 'Cup Plastik Reguler 16oz', qty: 1 },
          { name: 'Tutup Lid & Sedotan Higienis', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      },
      {
        name: 'Iced Americano',
        category: 'Minuman Kopi & Susu',
        sku: 'PRD-KPI-002',
        selling_price: 9000,
        description: 'Kopi hitam dingin segar double shot espresso tanpa gula',
        instructions: 'Ekstraksi 20gr kopi espresso, tambahkan air dingin 120ml dan es batu 200gr.',
        items: [
          { name: 'Bubuk Kopi Robusta Blend', qty: 20 },
          { name: 'Es Batu Kristal', qty: 200 },
          { name: 'Cup Plastik Reguler 16oz', qty: 1 },
          { name: 'Tutup Lid & Sedotan Higienis', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      },
      {
        name: 'French Fries Gurih (Kentang Goreng)',
        category: 'Makanan Ringan / Snack',
        sku: 'PRD-SNK-001',
        selling_price: 10000,
        description: 'Kentang goreng renyah bumbu tabur barbeque gurih',
        instructions: 'Goreng 150gr kentang dengan minyak panas 175°C selama 3-4 menit hingga keemasan, tiriskan, taburkan 5gr bumbu BBQ, masukkan ke box snack kraft bersama 2 sachet saus.',
        items: [
          { name: 'Kentang Beku Shoestring', qty: 150 },
          { name: 'Minyak Goreng Sawit', qty: 30 },
          { name: 'Bumbu Tabur Barbeque', qty: 5 },
          { name: 'Saus Sambal Sachet', qty: 2 },
          { name: 'Kemasan Box Snack Kraft', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      },
      {
        name: 'Sosis Goreng Crispy (2 Pcs)',
        category: 'Makanan Ringan / Snack',
        sku: 'PRD-SNK-002',
        selling_price: 9000,
        description: 'Dua batang sosis sapi jumbo mekar garing dengan cocolan saus',
        instructions: 'Kerat spiral 2 pcs sosis jumbo, goreng mekar dalam minyak panas, sajikan dalam kemasan box bersama 2 sachet saus sambal.',
        items: [
          { name: 'Sosis Sapi Jumbo', qty: 2 },
          { name: 'Minyak Goreng Sawit', qty: 20 },
          { name: 'Saus Sambal Sachet', qty: 2 },
          { name: 'Kemasan Box Snack Kraft', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      },
      {
        name: 'Ayam Fillet Crispy Rice Bowl',
        category: 'Makanan Utama',
        sku: 'PRD-MKG-001',
        selling_price: 15000,
        description: 'Nasi hangat pulen dengan potongan ayam fillet krispi saus sambal',
        instructions: 'Siapkan 100gr nasi putih dalam mangkok/box, goreng 80gr ayam fillet berbalut tepung renyah, potong dadu dan susun di atas nasi.',
        items: [
          { name: 'Beras Putih Premium', qty: 100 },
          { name: 'Daging Ayam Fillet Segar', qty: 80 },
          { name: 'Minyak Goreng Sawit', qty: 30 },
          { name: 'Saus Sambal Sachet', qty: 1 },
          { name: 'Kemasan Box Snack Kraft', qty: 1 },
          { name: 'Kantong Plastik Kresek 1 Cup', qty: 1 }
        ]
      }
    ];

    let createdProductCount = 0;
    let createdRecipeCount = 0;

    for (const menu of menuDefinitions) {
      // 1. Hitung total HPP berdasarkan komposisi bahan baku
      let calculatedCostPrice = 0;
      const validItems = [];

      for (const item of menu.items) {
        const ing = ingredientMap[item.name];
        if (ing) {
          const itemCost = parseFloat(ing.cost_per_unit) * item.qty;
          calculatedCostPrice += itemCost;
          validItems.push({
            ingredient_id: ing.id,
            quantity: item.qty
          });
        }
      }

      const costPriceRounded = Math.round(calculatedCostPrice);
      const catId = categoryMap[menu.category] || null;

      // 2. Buat atau perbarui produk
      let product = await Product.findOne({
        where: { business_id: businessId, sku: menu.sku },
        transaction
      });

      if (!product) {
        product = await Product.create({
          business_id: businessId,
          category_id: catId,
          name: menu.name,
          sku: menu.sku,
          description: menu.description,
          cost_price: costPriceRounded,
          selling_price: menu.selling_price,
          track_stock: false, // Stok dilacak otomatis via resep bahan baku
          is_active: true
        }, { transaction });
        createdProductCount++;
      } else {
        await product.update({
          category_id: catId,
          name: menu.name,
          description: menu.description,
          cost_price: costPriceRounded,
          selling_price: menu.selling_price
        }, { transaction });
      }

      // 3. Buat atau perbarui Resep
      let recipe = await Recipe.findOne({
        where: {
          business_id: businessId,
          product_id: product.id,
          product_variant_id: null
        },
        transaction
      });

      if (!recipe) {
        recipe = await Recipe.create({
          business_id: businessId,
          product_id: product.id,
          product_variant_id: null,
          instructions: menu.instructions,
          is_active: true
        }, { transaction });
        createdRecipeCount++;
      } else {
        await recipe.update({
          instructions: menu.instructions,
          is_active: true
        }, { transaction });
        // Hapus item lama untuk di-refresh
        await RecipeItem.destroy({
          where: { recipe_id: recipe.id },
          transaction
        });
      }

      // 4. Masukkan Komposisi Resep (RecipeItems)
      for (const vItem of validItems) {
        await RecipeItem.create({
          recipe_id: recipe.id,
          ingredient_id: vItem.ingredient_id,
          quantity: vItem.quantity
        }, { transaction });
      }
    }

    await transaction.commit();

    console.log(`✅ ${createdProductCount} Produk Menu dan ${createdRecipeCount} Resep Makanan/Minuman berhasil dibuat!`);
    console.log('\n====================================================');
    console.log('🎉 SEEDER BERHASIL DILAKSANAKAN!');
    console.log('====================================================');
    console.log(`- Total Kategori      : ${Object.keys(categoryMap).length}`);
    console.log(`- Total Bahan Baku    : ${ingredientList.length}`);
    console.log(`- Total Produk Menu   : ${menuDefinitions.length}`);
    console.log(`- Total Resep Aktif   : ${menuDefinitions.length}`);
    if (outletId) {
      console.log(`- Stok Awal Tercatat  : ${ingredientList.length} Bahan di [${outlet.name}]`);
    }
    console.log('====================================================\n');
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Gagal menjalankan seeder dummy:', error);
    throw error;
  }
}

// Jalankan langsung jika dipanggil dari CLI
if (require.main === module) {
  const targetId = process.argv[2] ? parseInt(process.argv[2], 10) : null;
  seedDummyData(targetId)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedDummyData;
