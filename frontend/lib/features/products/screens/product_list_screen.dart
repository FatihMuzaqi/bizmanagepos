import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/product_provider.dart';
import 'category_management_screen.dart';
import 'modifier_management_screen.dart';

class ProductListScreen extends StatefulWidget {
  const ProductListScreen({super.key});

  @override
  State<ProductListScreen> createState() => _ProductListScreenState();
}

class _ProductListScreenState extends State<ProductListScreen> {
  int? _selectedCategory;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().fetchCategories();
      context.read<ProductProvider>().fetchProducts();
      context.read<ProductProvider>().fetchModifiers();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _showAddProductDialog([Map<String, dynamic>? existing]) {
    final nameController = TextEditingController(text: existing?['name'] ?? '');
    final skuController = TextEditingController(text: existing?['sku'] ?? '');
    final priceController = TextEditingController(
      text: existing?['selling_price'] != null ? existing!['selling_price'].toString() : '',
    );
    int? selectedCatId = existing?['category_id'] ?? existing?['category']?['id'];

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setDialogState) {
          final categories = context.read<ProductProvider>().categories;

          return AlertDialog(
            title: Text(existing == null ? 'Tambah Menu / Produk Baru' : 'Edit Menu / Produk'),
            content: SizedBox(
              width: 440,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(
                        labelText: 'Nama Produk / Minuman *',
                        hintText: 'Contoh: Es Teh Melati Original',
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: skuController,
                      decoration: const InputDecoration(
                        labelText: 'Kode SKU / Menu (Opsional)',
                        hintText: 'Contoh: TEH-001',
                      ),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<int?>(
                      value: selectedCatId,
                      decoration: const InputDecoration(labelText: 'Kategori Produk'),
                      items: [
                        const DropdownMenuItem(value: null, child: Text('Tanpa Kategori')),
                        ...categories.map((c) => DropdownMenuItem(
                              value: c['id'] as int,
                              child: Text(c['name'] ?? ''),
                            )),
                      ],
                      onChanged: (val) {
                        setDialogState(() {
                          selectedCatId = val;
                        });
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: priceController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Harga Jual *',
                        prefixText: 'Rp ',
                        hintText: '10000',
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
                  if (nameController.text.trim().isEmpty) return;
                  final price = double.tryParse(priceController.text) ?? 0.0;
                  Navigator.of(ctx).pop();

                  try {
                    if (existing == null) {
                      await context.read<ProductProvider>().createProduct({
                        'name': nameController.text.trim(),
                        if (skuController.text.trim().isNotEmpty) 'sku': skuController.text.trim(),
                        if (selectedCatId != null) 'category_id': selectedCatId,
                        'selling_price': price,
                      });
                    } else {
                      await context.read<ProductProvider>().updateProduct(
                        existing['id'] as int,
                        {
                          'name': nameController.text.trim(),
                          if (skuController.text.trim().isNotEmpty) 'sku': skuController.text.trim(),
                          'category_id': selectedCatId,
                          'selling_price': price,
                        },
                      );
                    }
                    if (mounted) {
                      UiHelpers.showSnackBar(context, 'Produk berhasil disimpan', isSuccess: true);
                    }
                  } catch (e) {
                    if (mounted) {
                      UiHelpers.showSnackBar(context, 'Gagal menyimpan produk: $e', isError: true);
                    }
                  }
                },
                child: const Text('Simpan Produk'),
              ),
            ],
          );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final productProvider = context.watch<ProductProvider>();
    final authProvider = context.watch<AuthProvider>();
    final canManage = authProvider.hasPermission('product.create') || authProvider.hasPermission('product.manage');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Katalog Menu & Produk'),
        actions: [
          IconButton(
            icon: const Icon(Icons.category_outlined),
            tooltip: 'Kelola Kategori',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CategoryManagementScreen()),
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.tune_rounded),
            tooltip: 'Kelola Varian / Topping',
            onPressed: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ModifierManagementScreen()),
              );
            },
          ),
          if (canManage)
            IconButton(
              icon: const Icon(Icons.add_rounded),
              tooltip: 'Tambah Produk Baru',
              onPressed: () => _showAddProductDialog(),
            ),
        ],
      ),
      body: Column(
        children: [
          // Filter & Search bar
          Container(
            padding: const EdgeInsets.all(16),
            color: AppColors.surface,
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    decoration: InputDecoration(
                      hintText: 'Cari nama produk / menu...',
                      prefixIcon: const Icon(Icons.search_rounded),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear),
                              onPressed: () {
                                _searchController.clear();
                                productProvider.fetchProducts(categoryId: _selectedCategory);
                              },
                            )
                          : null,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                    ),
                    onChanged: (val) {
                      productProvider.fetchProducts(categoryId: _selectedCategory, search: val);
                    },
                  ),
                ),
                const SizedBox(width: 12),
                DropdownButton<int?>(
                  value: _selectedCategory,
                  hint: const Text('Semua Kategori'),
                  underline: const SizedBox(),
                  items: [
                    const DropdownMenuItem(value: null, child: Text('Semua Kategori')),
                    ...productProvider.categories.map((c) => DropdownMenuItem(
                          value: c['id'] as int,
                          child: Text(c['name'] ?? ''),
                        )),
                  ],
                  onChanged: (val) {
                    setState(() {
                      _selectedCategory = val;
                    });
                    productProvider.fetchProducts(categoryId: _selectedCategory, search: _searchController.text);
                  },
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Product List
          Expanded(
            child: productProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : productProvider.products.isEmpty
                    ? const Center(child: Text('Belum ada produk yang ditemukan'))
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: productProvider.products.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, index) {
                          final prod = productProvider.products[index];
                          final id = prod['id'] as int;
                          final name = prod['name'] ?? '';
                          final sku = prod['sku'];
                          final catName = prod['category']?['name'];
                          final price = prod['selling_price'];
                          final numPrice = price is num ? price : double.tryParse(price?.toString() ?? '0') ?? 0;

                          return Card(
                            child: Padding(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                children: [
                                  Container(
                                    width: 48,
                                    height: 48,
                                    decoration: BoxDecoration(
                                      color: AppColors.primaryContainer,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: const Icon(Icons.fastfood_rounded, color: AppColors.primary),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          name,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          '${catName != null ? '$catName • ' : ''}${sku != null ? 'Kode: $sku' : 'Tanpa Kode'}',
                                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    CurrencyFormatter.format(numPrice),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                  if (canManage) ...[
                                    const SizedBox(width: 8),
                                    PopupMenuButton<String>(
                                      icon: const Icon(Icons.more_vert, size: 20),
                                      onSelected: (action) async {
                                        if (action == 'edit') {
                                          _showAddProductDialog(prod);
                                        } else if (action == 'delete') {
                                          final confirmed = await UiHelpers.showConfirmDialog(
                                            context,
                                            title: 'Hapus Produk?',
                                            content: 'Apakah Anda yakin ingin menghapus menu "$name"?',
                                            isDestructive: true,
                                          );
                                          if (confirmed == true && mounted) {
                                            try {
                                              await productProvider.deleteProduct(id);
                                              if (mounted) {
                                                UiHelpers.showSnackBar(context, 'Produk berhasil dihapus', isSuccess: true);
                                              }
                                            } catch (e) {
                                              if (mounted) {
                                                UiHelpers.showSnackBar(context, 'Gagal menghapus: $e', isError: true);
                                              }
                                            }
                                          }
                                        }
                                      },
                                      itemBuilder: (_) => [
                                        const PopupMenuItem(value: 'edit', child: Text('Edit Produk')),
                                        const PopupMenuItem(
                                          value: 'delete',
                                          child: Text('Hapus Produk', style: TextStyle(color: AppColors.error)),
                                        ),
                                      ],
                                    ),
                                  ],
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
