import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/inventory_provider.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final inv = context.read<InventoryProvider>();
      inv.fetchUnits();
      inv.fetchIngredients();
      inv.fetchStocks();
      inv.fetchMovements();
      inv.fetchRecipes();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  // --- Stock In / Out / Adjustment Dialog ---
  void _showStockActionDialog(String actionType, [Map<String, dynamic>? preselectedStock]) {
    final qtyController = TextEditingController();
    final costController = TextEditingController();
    final noteController = TextEditingController();
    int? selectedIngredientId = preselectedStock?['ingredient_id'] ?? preselectedStock?['ingredient']?['id'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final ingredients = context.read<InventoryProvider>().ingredients;

          return AlertDialog(
            title: Text(actionType == 'IN'
                ? 'Stok Masuk (Kulakan / Restock)'
                : actionType == 'OUT'
                    ? 'Stok Keluar (Rusak / Terbuang)'
                    : 'Penyesuaian / Stok Opname'),
            content: SizedBox(
              width: 420,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    DropdownButtonFormField<int>(
                      value: selectedIngredientId,
                      decoration: const InputDecoration(labelText: 'Pilih Bahan Baku *'),
                      items: ingredients.map((ing) {
                        final unit = ing['unit']?['symbol'] ?? '';
                        return DropdownMenuItem<int>(
                          value: ing['id'] as int,
                          child: Text('${ing['name']} ($unit)'),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setDialogState(() {
                          selectedIngredientId = val;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: qtyController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: actionType == 'ADJUST' ? 'Jumlah Fisik Riil *' : 'Jumlah (Qty) *',
                        hintText: 'Contoh: 500',
                      ),
                    ),
                    if (actionType == 'IN') ...[
                      const SizedBox(height: 12),
                      TextField(
                        controller: costController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          labelText: 'Biaya Pokok per Satuan (Opsional)',
                          prefixText: 'Rp ',
                          hintText: '15000',
                        ),
                      ),
                    ],
                    const SizedBox(height: 12),
                    TextField(
                      controller: noteController,
                      decoration: const InputDecoration(
                        labelText: 'Catatan / Alasan (Opsional)',
                        hintText: 'Contoh: Belanja dari pasar / tumpah / audit',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Batal')),
              ElevatedButton(
                onPressed: () async {
                  if (selectedIngredientId == null || qtyController.text.trim().isEmpty) return;
                  final qty = double.tryParse(qtyController.text) ?? 0.0;
                  final cost = double.tryParse(costController.text);
                  Navigator.of(ctx).pop();

                  final inv = context.read<InventoryProvider>();
                  try {
                    if (actionType == 'IN') {
                      await inv.stockIn(
                        ingredientId: selectedIngredientId!,
                        quantity: qty,
                        costPerUnit: cost,
                        notes: noteController.text.trim(),
                      );
                    } else if (actionType == 'OUT') {
                      await inv.stockOut(
                        ingredientId: selectedIngredientId!,
                        quantity: qty,
                        notes: noteController.text.trim(),
                      );
                    } else {
                      await inv.stockAdjustment(
                        ingredientId: selectedIngredientId!,
                        actualQuantity: qty,
                        notes: noteController.text.trim(),
                      );
                    }
                    if (mounted) {
                      UiHelpers.showSnackBar(context, 'Data stok berhasil diperbarui', isSuccess: true);
                    }
                  } catch (e) {
                    if (mounted) {
                      UiHelpers.showSnackBar(context, 'Gagal memperbarui stok: $e', isError: true);
                    }
                  }
                },
                child: const Text('Simpan'),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- Add Unit Dialog ---
  void _showAddUnitDialog([StateSetter? parentSetState, void Function(int newUnitId)? onUnitCreated]) {
    final unitNameController = TextEditingController();
    final unitSymbolController = TextEditingController();

    // Quick presets for fast selection
    final presets = [
      {'name': 'Gram', 'symbol': 'gr'},
      {'name': 'Milliliter', 'symbol': 'ml'},
      {'name': 'Pieces', 'symbol': 'pcs'},
      {'name': 'Kilogram', 'symbol': 'kg'},
      {'name': 'Liter', 'symbol': 'L'},
      {'name': 'Cup', 'symbol': 'cup'},
      {'name': 'Sachet', 'symbol': 'sct'},
      {'name': 'Botol', 'symbol': 'btl'},
      {'name': 'Porsi', 'symbol': 'porsi'},
      {'name': 'Pack', 'symbol': 'pack'},
    ];

    showDialog(
      context: context,
      builder: (unitCtx) => StatefulBuilder(
        builder: (ctx, setUnitDialogState) {
          final inv = context.read<InventoryProvider>();

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.straighten_rounded, color: AppColors.primary, size: 22),
                SizedBox(width: 8),
                Text('Tambah Satuan Ukuran', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
            content: SizedBox(
              width: 400,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Pilih Rekomendasi Cepat (1-Klik):',
                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: presets.map((p) {
                        return ActionChip(
                          visualDensity: VisualDensity.compact,
                          padding: const EdgeInsets.symmetric(horizontal: 4),
                          label: Text('${p['name']} (${p['symbol']})', style: const TextStyle(fontSize: 11)),
                          onPressed: () {
                            setUnitDialogState(() {
                              unitNameController.text = p['name']!;
                              unitSymbolController.text = p['symbol']!;
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const Divider(height: 24),
                    TextField(
                      controller: unitNameController,
                      decoration: const InputDecoration(
                        labelText: 'Nama Satuan *',
                        hintText: 'Contoh: Gram, Milliliter, Sachet',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: unitSymbolController,
                      decoration: const InputDecoration(
                        labelText: 'Simbol / Singkatan *',
                        hintText: 'Contoh: gr, ml, sct, pcs',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(unitCtx).pop(), child: const Text('Batal')),
              ElevatedButton(
                onPressed: () async {
                  final name = unitNameController.text.trim();
                  final symbol = unitSymbolController.text.trim();
                  if (name.isEmpty || symbol.isEmpty) return;

                  try {
                    final created = await inv.createUnit(name, symbol);
                    if (unitCtx.mounted) {
                      Navigator.of(unitCtx).pop();
                    }

                    int? createdId;
                    if (created != null && created['id'] != null) {
                      createdId = created['id'] as int;
                    } else {
                      final matched = inv.units.firstWhere(
                        (u) => (u['symbol']?.toString().toLowerCase() == symbol.toLowerCase() ||
                                u['name']?.toString().toLowerCase() == name.toLowerCase()),
                        orElse: () => <String, dynamic>{},
                      );
                      if (matched.isNotEmpty && matched['id'] != null) {
                        createdId = matched['id'] as int;
                      }
                    }

                    if (createdId != null && onUnitCreated != null) {
                      onUnitCreated(createdId);
                    }

                    if (mounted) {
                      UiHelpers.showSnackBar(context, 'Satuan "$name ($symbol)" berhasil ditambahkan', isSuccess: true);
                    }
                  } catch (e) {
                    if (mounted) {
                      UiHelpers.showSnackBar(context, 'Gagal menambah satuan: $e', isError: true);
                    }
                  }
                },
                child: const Text('Simpan Satuan'),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- Add Ingredient Dialog ---
  void _showAddIngredientDialog() {
    final nameController = TextEditingController();
    final costController = TextEditingController();
    final minStockController = TextEditingController();
    int? selectedUnitId;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final units = context.watch<InventoryProvider>().units;

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Text('Tambah Bahan Baku Baru'),
            content: SizedBox(
              width: 420,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Nama Bahan Baku *', hintText: 'Contoh: Daun Teh Melati, Gula'),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Satuan Ukuran *',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.textPrimary),
                        ),
                        TextButton.icon(
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 0),
                            minimumSize: Size.zero,
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          onPressed: () => _showAddUnitDialog(setDialogState, (newId) {
                            setDialogState(() {
                              selectedUnitId = newId;
                            });
                          }),
                          icon: const Icon(Icons.add_circle_outline_rounded, size: 15, color: AppColors.primary),
                          label: const Text('+ Satuan Baru', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.primary)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    DropdownButtonFormField<int>(
                      value: selectedUnitId,
                      isExpanded: true,
                      hint: Text(units.isEmpty ? 'Belum ada satuan (Klik + Satuan Baru)' : 'Pilih Satuan (gram, ml, pcs...)'),
                      decoration: const InputDecoration(
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                      items: units.map((u) {
                        return DropdownMenuItem<int>(
                          value: u['id'] as int,
                          child: Text('${u['name']} (${u['symbol']})'),
                        );
                      }).toList(),
                      onChanged: (val) => setDialogState(() => selectedUnitId = val),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: costController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Harga Pokok Satuan (Rp)', prefixText: 'Rp '),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: minStockController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Batas Minimum Peringatan Stok (Alert)'),
                    ),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Batal')),
              ElevatedButton(
                onPressed: () async {
                  if (nameController.text.trim().isEmpty || selectedUnitId == null) {
                    if (mounted) {
                      UiHelpers.showSnackBar(context, 'Nama bahan dan Satuan ukuran wajib diisi', isError: true);
                    }
                    return;
                  }
                  Navigator.of(ctx).pop();
                  try {
                    await context.read<InventoryProvider>().createIngredient({
                      'name': nameController.text.trim(),
                      'unit_id': selectedUnitId,
                      'cost_per_unit': double.tryParse(costController.text) ?? 0.0,
                      'minimum_stock': double.tryParse(minStockController.text) ?? 0.0,
                    });
                    if (mounted) {
                      UiHelpers.showSnackBar(context, 'Bahan baku berhasil dibuat', isSuccess: true);
                    }
                  } catch (e) {
                    if (mounted) {
                      UiHelpers.showSnackBar(context, 'Gagal membuat bahan: $e', isError: true);
                    }
                  }
                },
                child: const Text('Simpan'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final invProvider = context.watch<InventoryProvider>();
    final authProvider = context.watch<AuthProvider>();
    final canAdjust = authProvider.hasPermission('inventory.adjust') || authProvider.hasPermission('inventory.create');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Manajemen Stok & Resep'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Sisa Stok'),
            Tab(text: 'Bahan Baku'),
            Tab(text: 'Resep Menu'),
            Tab(text: 'Riwayat Mutasi'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Current Stock Levels
          _buildStockTab(invProvider, canAdjust),

          // Tab 2: Ingredients
          _buildIngredientsTab(invProvider, canAdjust),

          // Tab 3: Recipes
          _buildRecipesTab(invProvider),

          // Tab 4: Stock Movements Audit
          _buildMovementsTab(invProvider),
        ],
      ),
    );
  }

  Widget _buildStockTab(InventoryProvider inv, bool canAdjust) {
    return Column(
      children: [
        if (canAdjust)
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _showStockActionDialog('IN'),
                    icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
                    label: const Text('Stok Masuk'),
                    style: ElevatedButton.styleFrom(backgroundColor: AppColors.primary),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showStockActionDialog('OUT'),
                    icon: const Icon(Icons.remove_shopping_cart_outlined, size: 18),
                    label: const Text('Stok Keluar'),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showStockActionDialog('ADJUST'),
                    icon: const Icon(Icons.tune_rounded, size: 18),
                    label: const Text('Opname'),
                  ),
                ),
              ],
            ),
          ),
        const Divider(height: 1),
        Expanded(
          child: inv.isLoading
              ? const Center(child: CircularProgressIndicator())
              : inv.stocks.isEmpty
                  ? const Center(child: Text('Belum ada data stok tercatat untuk cabang ini'))
                  : ListView.separated(
                      padding: const EdgeInsets.all(16),
                      itemCount: inv.stocks.length,
                      separatorBuilder: (_, __) => const SizedBox(height: 8),
                      itemBuilder: (ctx, index) {
                        final stock = inv.stocks[index];
                        final ingName = stock['ingredient']?['name'] ?? 'Bahan Baku';
                        final unit = stock['ingredient']?['unit']?['symbol'] ?? '';
                        final qty = stock['quantity'] ?? 0;
                        final min = stock['ingredient']?['minimum_stock'] ?? 0;
                        final isLow = qty <= min && min > 0;

                        return Card(
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: isLow ? AppColors.errorContainer : AppColors.primaryContainer,
                              child: Icon(
                                isLow ? Icons.warning_amber_rounded : Icons.inventory_2_rounded,
                                color: isLow ? AppColors.error : AppColors.primary,
                                size: 20,
                              ),
                            ),
                            title: Text(ingName, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text('Batas alert min: $min $unit'),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '$qty $unit',
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                    color: isLow ? AppColors.error : AppColors.textPrimary,
                                  ),
                                ),
                                if (isLow)
                                  const Text(
                                    'Stok Menipis',
                                    style: TextStyle(fontSize: 11, color: AppColors.error, fontWeight: FontWeight.bold),
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
        ),
      ],
    );
  }

  Widget _buildIngredientsTab(InventoryProvider inv, bool canAdjust) {
    return Column(
      children: [
        if (canAdjust)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _showAddUnitDialog(),
                    icon: const Icon(Icons.straighten_rounded, size: 18),
                    label: const Text('Tambah Satuan'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _showAddIngredientDialog,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Tambah Bahan'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
        const Divider(height: 1),
        Expanded(
          child: inv.ingredients.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.inventory_2_outlined, size: 48, color: AppColors.textTertiary),
                      SizedBox(height: 12),
                      Text(
                        'Belum ada bahan baku tercatat',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.textSecondary),
                      ),
                      SizedBox(height: 6),
                      Text(
                        'Klik tombol di atas untuk menambah satuan & bahan baku',
                        style: TextStyle(fontSize: 12, color: AppColors.textTertiary),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: inv.ingredients.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, index) {
                    final ing = inv.ingredients[index];
                    final unit = ing['unit']?['symbol'] ?? '';
                    final cost = ing['cost_per_unit'] ?? 0;

                    return Card(
                      child: ListTile(
                        leading: const CircleAvatar(
                          backgroundColor: AppColors.primaryContainer,
                          child: Icon(Icons.inventory_2_outlined, color: AppColors.primary, size: 20),
                        ),
                        title: Text(ing['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text('Biaya Pokok: ${CurrencyFormatter.format(cost)} / $unit'),
                        trailing: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: Text(
                            'Satuan: $unit',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
                          ),
                        ),
                      ),
                    );
                  },
                ),
        ),
      ],
    );
  }

  Widget _buildRecipesTab(InventoryProvider inv) {
    return inv.recipes.isEmpty
        ? const Center(child: Text('Belum ada resep menu yang diatur'))
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: inv.recipes.length,
            separatorBuilder: (_, __) => const SizedBox(height: 10),
            itemBuilder: (ctx, index) {
              final recipe = inv.recipes[index];
              final prodName = recipe['product']?['name'] ?? 'Produk';
              final varName = recipe['variant']?['name'];
              final items = (recipe['items'] as List? ?? []).cast<Map<String, dynamic>>();

              return Card(
                child: Padding(
                  padding: const EdgeInsets.all(14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$prodName${varName != null ? ' ($varName)' : ''}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                      ),
                      const Divider(height: 16),
                      ...items.map((it) {
                        final ing = it['ingredient']?['name'] ?? 'Bahan';
                        final qty = it['quantity'] ?? 0;
                        final unit = it['ingredient']?['unit']?['symbol'] ?? '';
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 2),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('• $ing', style: const TextStyle(fontSize: 13)),
                              Text('$qty $unit', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              );
            },
          );
  }

  Widget _buildMovementsTab(InventoryProvider inv) {
    return inv.movements.isEmpty
        ? const Center(child: Text('Belum ada riwayat mutasi stok'))
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: inv.movements.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, index) {
              final mov = inv.movements[index];
              final type = mov['type'] ?? 'IN';
              final isPositive = type == 'IN' || type == 'PURCHASE';
              final qty = mov['quantity'] ?? 0;
              final ingName = mov['ingredient']?['name'] ?? 'Bahan';
              final unit = mov['ingredient']?['unit']?['symbol'] ?? '';
              final date = mov['created_at'];

              String typeLabel = type;
              if (type == 'IN' || type == 'PURCHASE') typeLabel = 'Masuk / Restock';
              if (type == 'OUT' || type == 'WASTE') typeLabel = 'Keluar / Rusak';
              if (type == 'SALE' || type == 'POS_SALE') typeLabel = 'Penjualan POS';
              if (type == 'ADJUSTMENT') typeLabel = 'Penyesuaian Opname';

              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isPositive ? AppColors.successContainer : AppColors.errorContainer,
                    child: Icon(
                      isPositive ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                      color: isPositive ? AppColors.success : AppColors.error,
                      size: 18,
                    ),
                  ),
                  title: Text('$ingName ($typeLabel)'),
                  subtitle: Text(DateFormatter.formatDateTime(date)),
                  trailing: Text(
                    '${isPositive ? '+' : '-'}$qty $unit',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: isPositive ? AppColors.success : AppColors.error,
                    ),
                  ),
                ),
              );
            },
          );
  }
}
