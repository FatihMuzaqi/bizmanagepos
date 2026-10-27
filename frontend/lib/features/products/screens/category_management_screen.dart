import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/product_provider.dart';

class CategoryManagementScreen extends StatefulWidget {
  const CategoryManagementScreen({super.key});

  @override
  State<CategoryManagementScreen> createState() => _CategoryManagementScreenState();
}

class _CategoryManagementScreenState extends State<CategoryManagementScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().fetchCategories();
    });
  }

  void _showCategoryDialog([Map<String, dynamic>? existing]) {
    final nameController = TextEditingController(text: existing?['name'] ?? '');
    final descController = TextEditingController(text: existing?['description'] ?? '');

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing == null ? 'Tambah Kategori Baru' : 'Edit Kategori'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(
                labelText: 'Nama Kategori *',
                hintText: 'Contoh: Minuman Dingin, Snack, Topping',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descController,
              decoration: const InputDecoration(
                labelText: 'Deskripsi Keterangan (Opsional)',
                hintText: 'Contoh: Aneka sajian es teh segar',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Batal')),
          ElevatedButton(
            onPressed: () async {
              final name = nameController.text.trim();
              if (name.isEmpty) {
                UiHelpers.showWarning(context, 'Nama kategori wajib diisi', title: 'Form Belum Lengkap');
                return;
              }
              Navigator.of(ctx).pop();
              try {
                if (existing == null) {
                  await context.read<ProductProvider>().createCategory(
                        name,
                        descController.text.trim(),
                      );
                  if (mounted) {
                    UiHelpers.showSuccess(context, 'Kategori "$name" berhasil ditambahkan', title: 'Kategori Ditambahkan');
                  }
                } else {
                  await context.read<ProductProvider>().updateCategory(
                        existing['id'] as int,
                        name,
                        descController.text.trim(),
                      );
                  if (mounted) {
                    UiHelpers.showSuccess(context, 'Kategori "$name" berhasil diperbarui', title: 'Kategori Diperbarui');
                  }
                }
              } catch (e) {
                if (mounted) {
                  UiHelpers.showError(context, e, title: 'Gagal Menyimpan Kategori');
                }
              }
            },
            child: const Text('Simpan Kategori'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productProvider = context.watch<ProductProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Kategori Produk'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            tooltip: 'Tambah Kategori',
            onPressed: () => _showCategoryDialog(),
          ),
        ],
      ),
      body: productProvider.categories.isEmpty
          ? const Center(child: Text('Belum ada kategori. Klik + untuk menambahkan.'))
          : ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: productProvider.categories.length,
              separatorBuilder: (_, __) => const SizedBox(height: 8),
              itemBuilder: (ctx, index) {
                final cat = productProvider.categories[index];
                final id = cat['id'] as int;

                return Card(
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: AppColors.primaryContainer,
                      child: Icon(Icons.category_rounded, color: AppColors.primary, size: 20),
                    ),
                    title: Text(cat['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: cat['description'] != null ? Text(cat['description']) : null,
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.edit_outlined, size: 18),
                          tooltip: 'Edit Kategori',
                          onPressed: () => _showCategoryDialog(cat),
                        ),
                        IconButton(
                          icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                          tooltip: 'Hapus Kategori',
                          onPressed: () async {
                            final confirmed = await UiHelpers.showConfirmDialog(
                              context,
                              title: 'Hapus Kategori?',
                              content: 'Apakah Anda yakin ingin menghapus kategori "${cat['name']}"?',
                              isDestructive: true,
                            );
                            if (confirmed == true && context.mounted) {
                              try {
                                await productProvider.deleteCategory(id);
                                if (context.mounted) {
                                  UiHelpers.showSuccess(context, 'Kategori "${cat['name']}" berhasil dihapus', title: 'Kategori Dihapus');
                                }
                              } catch (e) {
                                if (context.mounted) {
                                  UiHelpers.showError(context, e, title: 'Gagal Menghapus Kategori');
                                }
                              }
                            }
                          },
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
