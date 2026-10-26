import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../products/providers/product_provider.dart';
import '../providers/pos_provider.dart';
import 'modifier_selection_dialog.dart';
import 'payment_dialog.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  int? _selectedCategoryId;
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ProductProvider>().fetchCategories();
      context.read<ProductProvider>().fetchProducts();
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onProductTap(Map<String, dynamic> product) async {
    // Fetch full product detail to get variants and modifiers, fallback to catalog item
    final fullProduct = await context.read<ProductProvider>().fetchProductDetail(product['id'] as int);
    if (!mounted) return;

    final targetProduct = fullProduct ?? product;
    final variants = (targetProduct['variants'] as List? ?? []).cast<Map<String, dynamic>>();
    final modifiers = (targetProduct['modifiers'] as List? ?? []).cast<Map<String, dynamic>>();

    if (variants.isNotEmpty || modifiers.isNotEmpty) {
      showDialog(
        context: context,
        builder: (_) => ModifierSelectionDialog(
          product: targetProduct,
          onConfirm: ({
            int? variantId,
            String? variantName,
            required double unitPrice,
            required List<Map<String, dynamic>> selectedModifiers,
            String? note,
          }) {
            context.read<PosProvider>().addToCart(
                  productId: targetProduct['id'] as int,
                  productName: targetProduct['name'] as String,
                  variantId: variantId,
                  variantName: variantName,
                  unitPrice: unitPrice,
                  selectedModifiers: selectedModifiers,
                  note: note,
                );
          },
        ),
      );
    } else {
      // Simple product
      final rawPrice = targetProduct['selling_price'] ?? targetProduct['price'] ?? product['selling_price'] ?? product['price'];
      final unitPrice = rawPrice is num ? rawPrice.toDouble() : (double.tryParse(rawPrice?.toString() ?? '0') ?? 0.0);
      context.read<PosProvider>().addToCart(
            productId: targetProduct['id'] as int,
            productName: targetProduct['name'] as String,
            unitPrice: unitPrice,
          );
    }
  }

  IconData _getProductIcon(String name, String? category) {
    final text = '${name.toLowerCase()} ${category?.toLowerCase() ?? ''}';
    if (text.contains('teh') || text.contains('tea')) {
      return Icons.emoji_food_beverage_rounded;
    }
    if (text.contains('kopi') || text.contains('coffee') || text.contains('americano') || text.contains('espresso')) {
      return Icons.coffee_rounded;
    }
    if (text.contains('ayam') || text.contains('nasi') || text.contains('rice') || text.contains('makan')) {
      return Icons.restaurant_rounded;
    }
    if (text.contains('kentang') || text.contains('fries') || text.contains('sosis') || text.contains('snack')) {
      return Icons.fastfood_rounded;
    }
    return Icons.local_dining_rounded;
  }

  @override
  Widget build(BuildContext context) {
    final productProvider = context.watch<ProductProvider>();
    final posProvider = context.watch<PosProvider>();
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth >= 900;
    final isTablet = screenWidth >= 600 && screenWidth < 900;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: Row(
        children: [
          // Left: Product Catalog & Search
          Expanded(
            flex: 3,
            child: Column(
              children: [
                // Top Search & Category Filter Bar
                Container(
                  padding: const EdgeInsets.all(16),
                  color: AppColors.surface,
                  child: Column(
                    children: [
                      // Search Box
                      TextField(
                        controller: _searchController,
                        decoration: InputDecoration(
                          hintText: 'Cari menu atau kode SKU...',
                          prefixIcon: const Icon(Icons.search_rounded),
                          suffixIcon: _searchController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.clear),
                                  onPressed: () {
                                    _searchController.clear();
                                    context.read<ProductProvider>().fetchProducts(categoryId: _selectedCategoryId);
                                  },
                                )
                              : null,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        ),
                        onChanged: (query) {
                          context.read<ProductProvider>().fetchProducts(
                                categoryId: _selectedCategoryId,
                                search: query,
                              );
                        },
                      ),
                      const SizedBox(height: 12),

                      // Category Pills List
                      SizedBox(
                        height: 36,
                        child: ListView(
                          scrollDirection: Axis.horizontal,
                          children: [
                            Padding(
                              padding: const EdgeInsets.only(right: 8),
                              child: ChoiceChip(
                                label: const Text('Semua Menu'),
                                selected: _selectedCategoryId == null,
                                selectedColor: AppColors.primaryContainer,
                                labelStyle: TextStyle(
                                  color: _selectedCategoryId == null ? AppColors.primary : AppColors.textPrimary,
                                  fontWeight: _selectedCategoryId == null ? FontWeight.bold : FontWeight.normal,
                                ),
                                onSelected: (selected) {
                                  setState(() {
                                    _selectedCategoryId = null;
                                  });
                                  context.read<ProductProvider>().fetchProducts(
                                        search: _searchController.text,
                                      );
                                },
                              ),
                            ),
                            ...productProvider.categories.map((cat) {
                              final isSelected = _selectedCategoryId == cat['id'];
                              return Padding(
                                padding: const EdgeInsets.only(right: 8),
                                child: ChoiceChip(
                                  label: Text(cat['name'] ?? ''),
                                  selected: isSelected,
                                  selectedColor: AppColors.primaryContainer,
                                  labelStyle: TextStyle(
                                    color: isSelected ? AppColors.primary : AppColors.textPrimary,
                                    fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                  ),
                                  onSelected: (selected) {
                                    setState(() {
                                      _selectedCategoryId = isSelected ? null : cat['id'] as int;
                                    });
                                    context.read<ProductProvider>().fetchProducts(
                                          categoryId: _selectedCategoryId,
                                          search: _searchController.text,
                                        );
                                  },
                                ),
                              );
                            }),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),

                // Product Grid
                Expanded(
                  child: productProvider.isLoading
                      ? const Center(child: CircularProgressIndicator())
                      : productProvider.products.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(Icons.inventory_2_outlined, size: 48, color: AppColors.textTertiary),
                                  const SizedBox(height: 12),
                                  Text(
                                    _searchController.text.isNotEmpty
                                        ? 'Tidak ada produk yang cocok dengan "${_searchController.text}"'
                                        : 'Tidak ada produk dalam kategori ini',
                                    style: const TextStyle(color: AppColors.textSecondary),
                                  ),
                                ],
                              ),
                            )
                          : GridView.builder(
                              padding: const EdgeInsets.all(16),
                              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: isDesktop ? 4 : (isTablet ? 3 : 2),
                                childAspectRatio: isDesktop
                                    ? 0.88
                                    : isTablet
                                        ? 0.78
                                        : (screenWidth < 360 ? 0.69 : 0.72),
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                              ),
                              itemCount: productProvider.products.length,
                              itemBuilder: (ctx, index) {
                                final prod = productProvider.products[index];
                                final price = prod['selling_price'];
                                final numPrice = price is num
                                    ? price
                                    : (double.tryParse(price?.toString() ?? '0') ?? 0);
                                final category = prod['category']?['name'];

                                return Card(
                                  elevation: 0,
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    side: const BorderSide(color: AppColors.cardBorder),
                                  ),
                                  clipBehavior: Clip.antiAlias,
                                  child: InkWell(
                                    borderRadius: BorderRadius.circular(12),
                                    onTap: () => _onProductTap(prod),
                                    child: Padding(
                                      padding: const EdgeInsets.all(10),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Container(
                                            height: 64,
                                            width: double.infinity,
                                            decoration: BoxDecoration(
                                              color: AppColors.primaryContainer.withValues(alpha: 0.45),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Center(
                                              child: Icon(
                                                _getProductIcon(prod['name'] ?? '', category),
                                                color: AppColors.primary,
                                                size: 30,
                                              ),
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          Text(
                                            prod['name'] ?? '',
                                            maxLines: 2,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13,
                                              height: 1.25,
                                            ),
                                          ),
                                          if (category != null && category.toString().trim().isNotEmpty) ...[
                                            const SizedBox(height: 2),
                                            Text(
                                              category,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontSize: 11,
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                          ],
                                          const Spacer(),
                                          Text(
                                            CurrencyFormatter.format(numPrice),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.bold,
                                              fontSize: 13.5,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                ),
              ],
            ),
          ),

          // Right: Active Order / Cart Panel
          if (isDesktop)
            Container(
              width: 360,
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(left: BorderSide(color: AppColors.cardBorder)),
              ),
              child: _buildCartPanel(context, posProvider),
            ),
        ],
      ),
      bottomNavigationBar: !isDesktop && posProvider.cart.isNotEmpty
          ? Container(
              padding: const EdgeInsets.all(16),
              color: AppColors.surface,
              child: ElevatedButton(
                onPressed: () {
                  showModalBottomSheet(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => SizedBox(
                      height: MediaQuery.of(context).size.height * 0.75,
                      child: _buildCartPanel(context, posProvider),
                    ),
                  );
                },
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${posProvider.totalItemCount} Menu Dipilih'),
                    Text('Lihat Pesanan: ${CurrencyFormatter.format(posProvider.cartSubtotal)}'),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildCartPanel(BuildContext context, PosProvider posProvider) {
    return Column(
      children: [
        // Cart Header
        Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Icon(Icons.shopping_bag_outlined, color: AppColors.primary),
                  const SizedBox(width: 8),
                  Text(
                    'Pesanan Aktif (${posProvider.totalItemCount})',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ],
              ),
              if (posProvider.cart.isNotEmpty)
                IconButton(
                  icon: const Icon(Icons.delete_sweep_outlined, color: AppColors.error, size: 20),
                  tooltip: 'Kosongkan Keranjang',
                  onPressed: posProvider.clearCart,
                ),
            ],
          ),
        ),
        const Divider(height: 1),

        // Cart Items List
        Expanded(
          child: posProvider.cart.isEmpty
              ? const Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.shopping_cart_outlined, size: 48, color: AppColors.textTertiary),
                      SizedBox(height: 12),
                      Text(
                        'Keranjang pesanan masih kosong',
                        style: TextStyle(color: AppColors.textSecondary, fontWeight: FontWeight.w500),
                      ),
                      SizedBox(height: 4),
                      Text(
                        'Pilih menu dari katalog untuk memulai pesanan',
                        style: TextStyle(color: AppColors.textTertiary, fontSize: 12),
                      ),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(12),
                  itemCount: posProvider.cart.length,
                  separatorBuilder: (_, __) => const SizedBox(height: 8),
                  itemBuilder: (ctx, index) {
                    final item = posProvider.cart[index];
                    return Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: AppColors.cardBorder),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item.productName,
                                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                    ),
                                    if (item.variantName != null)
                                      Text(
                                        'Varian: ${item.variantName}',
                                        style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                      ),
                                    if (item.selectedModifiers.isNotEmpty)
                                      Text(
                                        '+ ${item.selectedModifiers.map((m) => m['name']).join(', ')}',
                                        style: const TextStyle(fontSize: 11, color: AppColors.primary),
                                      ),
                                    if (item.note != null && item.note!.isNotEmpty)
                                      Text(
                                        'Catatan: ${item.note}',
                                        style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic),
                                      ),
                                  ],
                                ),
                              ),
                              Text(
                                CurrencyFormatter.format(item.subtotal),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                            ],
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.end,
                            children: [
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                icon: const Icon(Icons.remove_circle_outline, size: 20, color: AppColors.error),
                                onPressed: () => posProvider.updateQuantity(index, item.quantity - 1),
                              ),
                              Text(
                                '${item.quantity}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                              ),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                icon: const Icon(Icons.add_circle_outline, size: 20, color: AppColors.primary),
                                onPressed: () => posProvider.updateQuantity(index, item.quantity + 1),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  },
                ),
        ),

        // Cart Checkout Footer
        Container(
          padding: const EdgeInsets.all(16),
          decoration: const BoxDecoration(
            color: AppColors.surface,
            border: Border(top: BorderSide(color: AppColors.cardBorder)),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total Belanja', style: TextStyle(color: AppColors.textSecondary)),
                  Text(
                    CurrencyFormatter.format(posProvider.cartSubtotal),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: posProvider.cart.isEmpty
                    ? null
                    : () {
                        showDialog(
                          context: context,
                          builder: (_) => PaymentDialog(totalAmount: posProvider.cartSubtotal),
                        );
                      },
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Bayar Pesanan', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(
                      CurrencyFormatter.format(posProvider.cartSubtotal),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
