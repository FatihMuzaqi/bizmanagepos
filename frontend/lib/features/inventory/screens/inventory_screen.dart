import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../../products/providers/product_provider.dart';
import '../providers/inventory_provider.dart';

class _RecipeIngredientInput {
  int? ingredientId;
  final TextEditingController quantityController = TextEditingController();

  void dispose() {
    quantityController.dispose();
  }
}

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
      context.read<ProductProvider>().fetchProducts();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is num) return val.toDouble();
    if (val is String) return double.tryParse(val) ?? 0.0;
    return 0.0;
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

  // --- Add Recipe Dialog ---
  void _showAddRecipeDialog() {
    final productProvider = context.read<ProductProvider>();
    final invProvider = context.read<InventoryProvider>();

    if (productProvider.products.isEmpty) {
      productProvider.fetchProducts();
    }
    if (invProvider.ingredients.isEmpty) {
      invProvider.fetchIngredients();
    }

    final currentProducts = productProvider.products;
    int? selectedProductId = currentProducts.isNotEmpty ? currentProducts.first['id'] as int? : null;
    int? selectedVariantId;
    final instructionsController = TextEditingController();
    final List<_RecipeIngredientInput> itemRows = [
      _RecipeIngredientInput(),
    ];
    bool isSubmitting = false;

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (dialogCtx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          final products = context.watch<ProductProvider>().products;
          final ingredients = context.watch<InventoryProvider>().ingredients;

          // Find selected product to get variants
          Map<String, dynamic>? selectedProductObj;
          if (selectedProductId != null) {
            try {
              selectedProductObj = products.firstWhere((p) => p['id'] == selectedProductId);
            } catch (_) {}
          }
          final variants = (selectedProductObj?['variants'] as List? ?? []).cast<Map<String, dynamic>>();

          // Calculate estimated total HPP live (safely parsing String & num)
          double totalHpp = 0.0;
          for (final row in itemRows) {
            if (row.ingredientId != null) {
              final ing = ingredients.firstWhere(
                (i) => i['id'] == row.ingredientId,
                orElse: () => <String, dynamic>{},
              );
              final costPerUnit = _toDouble(ing['cost_per_unit']);
              final qty = double.tryParse(row.quantityController.text) ?? 0.0;
              totalHpp += (costPerUnit * qty);
            }
          }

          final screenWidth = MediaQuery.of(dialogCtx).size.width;
          final dialogWidth = screenWidth > 540 ? 500.0 : (screenWidth - 32);

          return AlertDialog(
            insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Row(
              children: [
                Icon(Icons.menu_book_rounded, color: AppColors.primary),
                SizedBox(width: 8),
                Expanded(
                  child: Text('Tambah Resep Menu', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
            content: SizedBox(
              width: dialogWidth,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Pilih Menu Produk *',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    if (products.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.errorContainer.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Belum ada menu produk terdaftar. Silakan tambahkan produk di menu Produk terlebih dahulu.',
                          style: TextStyle(fontSize: 12, color: AppColors.error),
                        ),
                      )
                    else
                      DropdownButtonFormField<int>(
                        value: selectedProductId,
                        isExpanded: true,
                        decoration: const InputDecoration(
                          hintText: 'Pilih Menu Produk',
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        items: products.map((prod) {
                          return DropdownMenuItem<int>(
                            value: prod['id'] as int,
                            child: Text(prod['name'] ?? 'Menu', overflow: TextOverflow.ellipsis),
                          );
                        }).toList(),
                        onChanged: (val) {
                          setDialogState(() {
                            selectedProductId = val;
                            selectedVariantId = null;
                          });
                        },
                      ),

                    if (variants.isNotEmpty) ...[
                      const SizedBox(height: 14),
                      const Text(
                        'Pilih Varian (Opsional)',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<int?>(
                        value: selectedVariantId,
                        isExpanded: true,
                        decoration: const InputDecoration(
                          contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        ),
                        items: [
                          const DropdownMenuItem<int?>(
                            value: null,
                            child: Text('Semua Varian (Resep Default Produk)', overflow: TextOverflow.ellipsis),
                          ),
                          ...variants.map((v) => DropdownMenuItem<int?>(
                                value: v['id'] as int,
                                child: Text('Varian: ${v['name']}', overflow: TextOverflow.ellipsis),
                              )),
                        ],
                        onChanged: (val) {
                          setDialogState(() {
                            selectedVariantId = val;
                          });
                        },
                      ),
                    ],

                    const SizedBox(height: 14),
                    const Text(
                      'Instruksi Racikan (Opsional)',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                    const SizedBox(height: 6),
                    TextField(
                      controller: instructionsController,
                      maxLines: 2,
                      decoration: const InputDecoration(
                        hintText: 'Contoh: Larutkan biang teh dengan gula cair, tambahkan es batu hingga penuh.',
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                      ),
                    ),

                    const SizedBox(height: 18),
                    // Responsive Header Komposisi Bahan Baku
                    Row(
                      children: [
                        const Expanded(
                          child: Text(
                            'Komposisi Bahan Baku *',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          ),
                        ),
                        TextButton.icon(
                          onPressed: () {
                            setDialogState(() {
                              itemRows.add(_RecipeIngredientInput());
                            });
                          },
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          ),
                          icon: const Icon(Icons.add_circle_outline, size: 16),
                          label: const Text('+ Tambah', style: TextStyle(fontSize: 12)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 6),

                    if (ingredients.isEmpty)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.errorContainer.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Belum ada data bahan baku. Silakan tambahkan bahan baku di Tab "Bahan Baku" terlebih dahulu.',
                          style: TextStyle(fontSize: 12, color: AppColors.error),
                        ),
                      )
                    else
                      ...List.generate(itemRows.length, (idx) {
                        final row = itemRows[idx];
                        Map<String, dynamic>? selectedIngObj;
                        if (row.ingredientId != null) {
                          try {
                            selectedIngObj = ingredients.firstWhere((i) => i['id'] == row.ingredientId);
                          } catch (_) {}
                        }
                        final unitSymbol = selectedIngObj?['unit']?['symbol'] ?? '';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 10),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  Expanded(
                                    child: DropdownButtonFormField<int>(
                                      value: row.ingredientId,
                                      isExpanded: true,
                                      decoration: const InputDecoration(
                                        labelText: 'Pilih Bahan Baku *',
                                        isDense: true,
                                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                      ),
                                      items: ingredients.map((ing) {
                                        final sym = ing['unit']?['symbol'] ?? '';
                                        return DropdownMenuItem<int>(
                                          value: ing['id'] as int,
                                          child: Text(
                                            '${ing['name']} ($sym)',
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        );
                                      }).toList(),
                                      onChanged: (val) {
                                        setDialogState(() {
                                          row.ingredientId = val;
                                        });
                                      },
                                    ),
                                  ),
                                  if (itemRows.length > 1) ...[
                                    const SizedBox(width: 6),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 22),
                                      tooltip: 'Hapus Baris',
                                      padding: EdgeInsets.zero,
                                      constraints: const BoxConstraints(),
                                      onPressed: () {
                                        setDialogState(() {
                                          itemRows[idx].dispose();
                                          itemRows.removeAt(idx);
                                        });
                                      },
                                    ),
                                  ],
                                ],
                              ),
                              const SizedBox(height: 10),
                              TextField(
                                controller: row.quantityController,
                                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                                decoration: InputDecoration(
                                  labelText: 'Jumlah Takaran per 1 Cup *',
                                  hintText: 'Contoh: 25 atau 0.5',
                                  isDense: true,
                                  suffixText: unitSymbol.isNotEmpty ? unitSymbol : null,
                                  suffixStyle: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                                ),
                                onChanged: (_) => setDialogState(() {}),
                              ),
                            ],
                          ),
                        );
                      }),

                    // Live HPP badge
                    if (totalHpp > 0) ...[
                      const SizedBox(height: 10),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: AppColors.primaryContainer.withValues(alpha: 0.5),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.calculate_rounded, color: AppColors.primary, size: 20),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Estimasi HPP Bahan Baku: ${CurrencyFormatter.format(totalHpp)} / cup',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: AppColors.primary),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: isSubmitting
                    ? null
                    : () {
                        for (final r in itemRows) {
                          r.dispose();
                        }
                        instructionsController.dispose();
                        Navigator.of(dialogCtx).pop();
                      },
                child: const Text('Batal'),
              ),
              ElevatedButton(
                onPressed: isSubmitting
                    ? null
                    : () async {
                        if (selectedProductId == null) {
                          if (mounted) {
                            UiHelpers.showSnackBar(context, 'Pilih menu produk terlebih dahulu', isError: true);
                          }
                          return;
                        }

                        final validItems = <Map<String, dynamic>>[];
                        final usedIngredientIds = <int>{};

                        for (final row in itemRows) {
                          if (row.ingredientId == null) continue;
                          final qty = double.tryParse(row.quantityController.text);
                          if (qty == null || qty <= 0) {
                            if (mounted) {
                              UiHelpers.showSnackBar(context, 'Jumlah takaran bahan harus lebih dari 0', isError: true);
                            }
                            return;
                          }
                          if (usedIngredientIds.contains(row.ingredientId!)) {
                            if (mounted) {
                              UiHelpers.showSnackBar(context, 'Bahan baku tidak boleh ganda dalam satu resep', isError: true);
                            }
                            return;
                          }
                          usedIngredientIds.add(row.ingredientId!);
                          validItems.add({
                            'ingredient_id': row.ingredientId,
                            'quantity': qty,
                          });
                        }

                        if (validItems.isEmpty) {
                          if (mounted) {
                            UiHelpers.showSnackBar(context, 'Tambahkan minimal 1 bahan baku untuk resep menu ini', isError: true);
                          }
                          return;
                        }

                        setDialogState(() => isSubmitting = true);

                        try {
                          final payload = <String, dynamic>{
                            'product_id': selectedProductId,
                            if (selectedVariantId != null) 'product_variant_id': selectedVariantId,
                            if (instructionsController.text.trim().isNotEmpty)
                              'instructions': instructionsController.text.trim(),
                            'items': validItems,
                          };

                          await context.read<InventoryProvider>().createRecipe(payload);

                          for (final r in itemRows) {
                            r.dispose();
                          }
                          instructionsController.dispose();

                          if (dialogCtx.mounted) {
                            Navigator.of(dialogCtx).pop();
                          }
                          if (mounted) {
                            UiHelpers.showSnackBar(context, 'Resep menu berhasil disimpan!', isSuccess: true);
                          }
                        } catch (e) {
                          setDialogState(() => isSubmitting = false);
                          if (mounted) {
                            UiHelpers.showSnackBar(context, 'Gagal menyimpan resep: $e', isError: true);
                          }
                        }
                      },
                child: isSubmitting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                    : const Text('Simpan Resep'),
              ),
            ],
          );
        },
      ),
    );
  }

  // --- Confirm Delete Recipe ---
  void _confirmDeleteRecipe(int recipeId, String recipeTitle) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Hapus Resep Menu?'),
        content: Text(
          'Apakah Anda yakin ingin menghapus resep untuk "$recipeTitle"?\n\n'
          'Setelah dihapus, penjualan produk ini di kasir tidak akan lagi memotong stok bahan baku secara otomatis.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            onPressed: () async {
              Navigator.of(ctx).pop();
              try {
                await context.read<InventoryProvider>().deleteRecipe(recipeId);
                if (mounted) {
                  UiHelpers.showSnackBar(context, 'Resep berhasil dihapus', isSuccess: true);
                }
              } catch (e) {
                if (mounted) {
                  UiHelpers.showSnackBar(context, 'Gagal menghapus resep: $e', isError: true);
                }
              }
            },
            child: const Text('Hapus'),
          ),
        ],
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
          _buildRecipesTab(invProvider, canAdjust),

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
                        final ingName = stock['name'] ?? stock['ingredient']?['name'] ?? 'Bahan Baku';
                        final unit = stock['unit'] is Map
                            ? (stock['unit']['symbol'] ?? '')
                            : (stock['ingredient']?['unit']?['symbol'] ?? '');
                        final doubleQty = _toDouble(stock['current_stock'] ?? stock['quantity'] ?? 0);
                        final doubleMin = _toDouble(stock['minimum_stock'] ?? stock['ingredient']?['minimum_stock'] ?? 0);
                        final isLow = (stock['status'] == 'LOW_STOCK') || (doubleQty <= doubleMin && doubleMin > 0);
                        final displayQty = doubleQty % 1 == 0
                            ? doubleQty.toInt().toString()
                            : doubleQty.toStringAsFixed(2);
                        final displayMin = doubleMin % 1 == 0
                            ? doubleMin.toInt().toString()
                            : doubleMin.toStringAsFixed(2);

                        return Card(
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                            side: const BorderSide(color: AppColors.cardBorder),
                          ),
                          child: ListTile(
                            onTap: canAdjust ? () => _showStockActionDialog('IN', stock) : null,
                            leading: CircleAvatar(
                              backgroundColor: isLow ? AppColors.errorContainer : AppColors.primaryContainer,
                              child: Icon(
                                isLow ? Icons.warning_amber_rounded : Icons.inventory_2_rounded,
                                color: isLow ? AppColors.error : AppColors.primary,
                                size: 20,
                              ),
                            ),
                            title: Text(ingName, style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Text('Batas alert min: $displayMin $unit'),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '$displayQty $unit',
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
                    final cost = _toDouble(ing['cost_per_unit']);

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

  Widget _buildRecipesTab(InventoryProvider inv, bool canManage) {
    return Column(
      children: [
        if (canManage)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 14, 16, 8),
            child: Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: _showAddRecipeDialog,
                    icon: const Icon(Icons.add_rounded, size: 18),
                    label: const Text('Tambah Resep Menu'),
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
          child: inv.recipes.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.menu_book_outlined, size: 48, color: AppColors.textTertiary),
                      SizedBox(height: 12),
                      Text(
                        'Belum ada resep menu yang diatur',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          fontSize: 15,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: inv.recipes.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 12),
                  itemBuilder: (ctx, index) {
                    final recipe = inv.recipes[index];
                    final prodName = recipe['product']?['name'] ?? 'Produk';
                    final varName = recipe['variant']?['name'];
                    final instructions = recipe['instructions'] as String?;
                    final items = (recipe['items'] as List? ?? []).cast<Map<String, dynamic>>();

                    // Calculate total estimated HPP for this recipe
                    double totalHpp = 0.0;
                    for (final it in items) {
                      final cost = _toDouble(it['ingredient']?['cost_per_unit']);
                      final qty = _toDouble(it['quantity']);
                      totalHpp += (cost * qty);
                    }

                    return Card(
                      elevation: 1,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppColors.cardBorder),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const CircleAvatar(
                                  radius: 20,
                                  backgroundColor: AppColors.primaryContainer,
                                  child: Icon(Icons.local_cafe_rounded, color: AppColors.primary, size: 20),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        prodName,
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                      ),
                                      const SizedBox(height: 4),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: varName != null ? AppColors.secondary.withOpacity(0.15) : AppColors.cardBorder,
                                          borderRadius: BorderRadius.circular(6),
                                        ),
                                        child: Text(
                                          varName != null ? 'Varian: $varName' : 'Resep Standar (Semua Varian)',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: varName != null ? AppColors.secondary : AppColors.textSecondary,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (canManage)
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 22),
                                    tooltip: 'Hapus Resep',
                                    onPressed: () {
                                      final title = '$prodName${varName != null ? " ($varName)" : ""}';
                                      _confirmDeleteRecipe(recipe['id'] as int, title);
                                    },
                                  ),
                              ],
                            ),
                            if (instructions != null && instructions.trim().isNotEmpty) ...[
                              const SizedBox(height: 10),
                              Container(
                                width: double.infinity,
                                padding: const EdgeInsets.all(10),
                                decoration: BoxDecoration(
                                  color: AppColors.background,
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.cardBorder.withOpacity(0.6)),
                                ),
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Icon(Icons.info_outline, size: 15, color: AppColors.textSecondary),
                                    const SizedBox(width: 6),
                                    Expanded(
                                      child: Text(
                                        instructions,
                                        style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic, color: AppColors.textSecondary),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                            const SizedBox(height: 12),
                            const Text(
                              'Takaran Bahan Baku per Cup/Porsi:',
                              style: TextStyle(fontWeight: FontWeight.w600, fontSize: 12, color: AppColors.textSecondary),
                            ),
                            const SizedBox(height: 6),
                            Container(
                              decoration: BoxDecoration(
                                color: AppColors.background,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: AppColors.cardBorder),
                              ),
                              child: Column(
                                children: items.map((it) {
                                  final ing = it['ingredient']?['name'] ?? 'Bahan';
                                  final qty = it['quantity'] ?? 0;
                                  final unit = it['ingredient']?['unit']?['symbol'] ?? '';
                                  final cost = _toDouble(it['ingredient']?['cost_per_unit']);
                                  final parsedQty = _toDouble(qty);
                                  final subtotal = cost * parsedQty;

                                  return Padding(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                                    child: Row(
                                      children: [
                                        const Icon(Icons.circle, size: 6, color: AppColors.primary),
                                        const SizedBox(width: 8),
                                        Expanded(
                                          child: Text(
                                            ing,
                                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                                          ),
                                        ),
                                        Text(
                                          '$qty $unit',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                        if (subtotal > 0) ...[
                                          const SizedBox(width: 8),
                                          Text(
                                            '(${CurrencyFormatter.format(subtotal)})',
                                            style: const TextStyle(fontSize: 11, color: AppColors.textTertiary),
                                          ),
                                        ],
                                      ],
                                    ),
                                  );
                                }).toList(),
                              ),
                            ),
                            const SizedBox(height: 10),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '${items.length} jenis bahan baku',
                                  style: const TextStyle(fontSize: 12, color: AppColors.textTertiary),
                                ),
                                if (totalHpp > 0)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: AppColors.successContainer.withOpacity(0.5),
                                      borderRadius: BorderRadius.circular(6),
                                      border: Border.all(color: AppColors.success.withOpacity(0.4)),
                                    ),
                                    child: Text(
                                      'Estimasi HPP: ${CurrencyFormatter.format(totalHpp)} / cup',
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.success),
                                    ),
                                  ),
                              ],
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

  Widget _buildMovementsTab(InventoryProvider inv) {
    return inv.movements.isEmpty
        ? const Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.history_rounded, size: 48, color: AppColors.textTertiary),
                SizedBox(height: 12),
                Text(
                  'Belum ada riwayat mutasi stok',
                  style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          )
        : ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: inv.movements.length,
            separatorBuilder: (_, __) => const SizedBox(height: 8),
            itemBuilder: (ctx, index) {
              final mov = inv.movements[index];
              final type = mov['type'] ?? 'IN';
              final isPositive = type == 'IN' || type == 'PURCHASE';
              final doubleQty = _toDouble(mov['quantity']);
              final displayQty = doubleQty % 1 == 0
                  ? doubleQty.toInt().toString()
                  : doubleQty.toStringAsFixed(2);
              final ingName = mov['ingredient']?['name'] ?? 'Bahan';
              final unit = mov['ingredient']?['unit']?['symbol'] ?? '';
              final date = mov['created_at'];
              final notes = mov['notes'] ?? '';

              String typeLabel = type;
              if (type == 'IN' || type == 'PURCHASE') typeLabel = 'Masuk / Restock';
              if (type == 'OUT' || type == 'WASTE') typeLabel = 'Keluar / Rusak';
              if (type == 'SALE' || type == 'POS_SALE') typeLabel = 'Penjualan POS';
              if (type == 'ADJUSTMENT') typeLabel = 'Penyesuaian Opname';

              return Card(
                elevation: 0,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: const BorderSide(color: AppColors.cardBorder),
                ),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: isPositive
                        ? AppColors.successContainer
                        : AppColors.errorContainer,
                    child: Icon(
                      isPositive ? Icons.arrow_downward_rounded : Icons.arrow_upward_rounded,
                      color: isPositive ? AppColors.success : AppColors.error,
                      size: 20,
                    ),
                  ),
                  title: Text(
                    ingName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 2),
                      Text(
                        typeLabel,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                          color: isPositive ? AppColors.success : AppColors.error,
                        ),
                      ),
                      Text(
                        notes.toString().isNotEmpty
                            ? '${DateFormatter.formatDateTime(date)} • $notes'
                            : DateFormatter.formatDateTime(date),
                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                  trailing: Text(
                    '${isPositive ? '+' : '-'}$displayQty $unit',
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
