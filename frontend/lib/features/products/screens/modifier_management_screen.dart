import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/product_provider.dart';

class ModifierManagementScreen extends StatefulWidget {
  const ModifierManagementScreen({super.key});

  @override
  State<ModifierManagementScreen> createState() => _ModifierManagementScreenState();
}

class _ModifierManagementScreenState extends State<ModifierManagementScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().fetchModifiers();
    });
  }

  void _showAddModifierDialog() {
    final nameController = TextEditingController();
    final List<Map<String, dynamic>> options = [];
    final optNameController = TextEditingController();
    final optPriceController = TextEditingController();

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Tambah Kelompok Topping / Varian'),
          content: SizedBox(
            width: 440,
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  TextField(
                    controller: nameController,
                    decoration: const InputDecoration(
                      labelText: 'Nama Kelompok Varian *',
                      hintText: 'Contoh: Extra Topping, Level Manis, Es',
                    ),
                  ),
                  const SizedBox(height: 16),
                  const Text('Daftar Pilihan / Opsi', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                  const SizedBox(height: 8),

                  Row(
                    children: [
                      Expanded(
                        flex: 3,
                        child: TextField(
                          controller: optNameController,
                          decoration: const InputDecoration(labelText: 'Nama Opsi', hintText: 'Contoh: Boba, Cincau'),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        flex: 2,
                        child: TextField(
                          controller: optPriceController,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Harga Tambahan', prefixText: 'Rp '),
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.add_circle, color: AppColors.primary),
                        tooltip: 'Tambah Opsi',
                        onPressed: () {
                          if (optNameController.text.trim().isEmpty) return;
                          final priceVal = double.tryParse(optPriceController.text) ?? 0.0;
                          setDialogState(() {
                            options.add({
                              'name': optNameController.text.trim(),
                              'price': priceVal,
                              'price_adjustment': priceVal,
                            });
                            optNameController.clear();
                            optPriceController.clear();
                          });
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (options.isNotEmpty)
                    ...options.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final opt = entry.value;
                      return ListTile(
                        dense: true,
                        title: Text(opt['name']),
                        trailing: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(CurrencyFormatter.format(opt['price'])),
                            IconButton(
                              icon: const Icon(Icons.close, size: 16, color: AppColors.error),
                              onPressed: () {
                                setDialogState(() {
                                  options.removeAt(idx);
                                });
                              },
                            ),
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Batal')),
            ElevatedButton(
              onPressed: () async {
                final name = nameController.text.trim();
                if (name.isEmpty) {
                  UiHelpers.showWarning(context, 'Nama kelompok varian wajib diisi', title: 'Form Belum Lengkap');
                  return;
                }
                Navigator.of(ctx).pop();
                try {
                  await context.read<ProductProvider>().createModifier({
                    'name': name,
                    if (options.isNotEmpty) 'options': options,
                  });
                  if (context.mounted) {
                    UiHelpers.showSuccess(context, 'Kelompok varian "$name" berhasil dibuat', title: 'Varian Berhasil Dibuat');
                  }
                } catch (e) {
                  if (context.mounted) {
                    UiHelpers.showError(context, e, title: 'Gagal Membuat Varian');
                  }
                }
              },
              child: const Text('Simpan Varian'),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productProvider = context.watch<ProductProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Varian & Topping Menu'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Tambah Varian',
            onPressed: _showAddModifierDialog,
          ),
        ],
      ),
      body: productProvider.modifiers.isEmpty
          ? const Center(child: Text('Belum ada varian / topping. Klik + untuk menambahkan.'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: productProvider.modifiers.length,
              separatorBuilder: (_, __) => const SizedBox(height: 12),
              itemBuilder: (ctx, index) {
                final mod = productProvider.modifiers[index];
                final id = mod['id'] as int;
                final options = (mod['options'] as List? ?? []).cast<Map<String, dynamic>>();

                return Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              mod['name'] ?? '',
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, color: AppColors.error, size: 20),
                              tooltip: 'Hapus Varian',
                              onPressed: () async {
                                final confirmed = await UiHelpers.showConfirmDialog(
                                  context,
                                  title: 'Hapus Varian?',
                                  content: 'Apakah Anda yakin ingin menghapus "${mod['name']}"?',
                                  isDestructive: true,
                                );
                                if (confirmed == true && context.mounted) {
                                  try {
                                    await productProvider.deleteModifier(id);
                                    if (context.mounted) {
                                      UiHelpers.showSuccess(context, 'Kelompok varian berhasil dihapus', title: 'Varian Dihapus');
                                    }
                                  } catch (e) {
                                    if (context.mounted) {
                                      UiHelpers.showError(context, e, title: 'Gagal Menghapus Varian');
                                    }
                                  }
                                }
                              },
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 6,
                          children: options.map((opt) {
                            final rawP = opt['price_adjustment'] ?? opt['price'];
                            final p = rawP is num ? rawP : (double.tryParse(rawP?.toString() ?? '0') ?? 0);
                            return Chip(
                              label: Text('${opt['name']} (+${CurrencyFormatter.format(p)})'),
                              backgroundColor: AppColors.background,
                              side: const BorderSide(color: AppColors.cardBorder),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
    );
  }
}
