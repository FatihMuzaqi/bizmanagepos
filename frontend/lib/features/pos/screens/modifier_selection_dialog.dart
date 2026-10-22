import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';

class ModifierSelectionDialog extends StatefulWidget {
  final Map<String, dynamic> product;
  final Function({
    int? variantId,
    String? variantName,
    required double unitPrice,
    required List<Map<String, dynamic>> selectedModifiers,
    String? note,
  }) onConfirm;

  const ModifierSelectionDialog({
    super.key,
    required this.product,
    required this.onConfirm,
  });

  @override
  State<ModifierSelectionDialog> createState() => _ModifierSelectionDialogState();
}

class _ModifierSelectionDialogState extends State<ModifierSelectionDialog> {
  Map<String, dynamic>? _selectedVariant;
  final List<Map<String, dynamic>> _selectedModifiers = [];
  final _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final variants = (widget.product['variants'] as List? ?? []).cast<Map<String, dynamic>>();
    if (variants.isNotEmpty) {
      _selectedVariant = variants.first;
    }
  }

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  double _parsePrice(dynamic val) {
    if (val == null) return 0.0;
    if (val is num) return val.toDouble();
    return double.tryParse(val.toString()) ?? 0.0;
  }

  double get _basePrice {
    if (_selectedVariant != null) {
      final p = _selectedVariant!['selling_price'] ?? _selectedVariant!['price'];
      return _parsePrice(p);
    }
    final p = widget.product['selling_price'] ?? widget.product['price'];
    return _parsePrice(p);
  }

  double get _totalPrice {
    double total = _basePrice;
    for (var m in _selectedModifiers) {
      final p = m['price_adjustment'] ?? m['price'];
      total += _parsePrice(p);
    }
    return total;
  }

  @override
  Widget build(BuildContext context) {
    final variants = (widget.product['variants'] as List? ?? []).cast<Map<String, dynamic>>();
    final modifiers = (widget.product['modifiers'] as List? ?? []).cast<Map<String, dynamic>>();

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480, maxHeight: 620),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      widget.product['name'] ?? 'Menu / Produk',
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const Divider(height: 20),

              // Scrollable Options
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Variants Section
                      if (variants.isNotEmpty) ...[
                        const Text(
                          'Pilih Ukuran / Varian',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: variants.map((v) {
                            final isSelected = _selectedVariant?['id'] == v['id'];
                            final price = _parsePrice(v['selling_price'] ?? v['price']);
                            return ChoiceChip(
                              label: Text('${v['name']} (${CurrencyFormatter.format(price)})'),
                              selected: isSelected,
                              selectedColor: AppColors.primaryContainer,
                              labelStyle: TextStyle(
                                color: isSelected ? AppColors.primary : AppColors.textPrimary,
                                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                              ),
                              onSelected: (selected) {
                                if (selected) {
                                  setState(() {
                                    _selectedVariant = v;
                                  });
                                }
                              },
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 20),
                      ],

                      // Modifiers Section
                      if (modifiers.isNotEmpty) ...[
                        const Text(
                          'Topping & Pilihan Tambahan',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        ),
                        const SizedBox(height: 8),
                        ...modifiers.map((modGroup) {
                          final options = (modGroup['options'] as List? ?? []).cast<Map<String, dynamic>>();
                          return Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                modGroup['name'] ?? 'Pilihan',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              ...options.map((opt) {
                                final isChecked = _selectedModifiers.any((m) => m['id'] == opt['id']);
                                final optPrice = _parsePrice(opt['price_adjustment'] ?? opt['price']);

                                return CheckboxListTile(
                                  dense: true,
                                  contentPadding: EdgeInsets.zero,
                                  title: Text(opt['name'] ?? ''),
                                  subtitle: optPrice > 0 ? Text('+ ${CurrencyFormatter.format(optPrice)}') : null,
                                  value: isChecked,
                                  onChanged: (val) {
                                    setState(() {
                                      if (val == true) {
                                        _selectedModifiers.add({
                                          ...opt,
                                          'price': optPrice,
                                          'price_adjustment': optPrice,
                                          'modifier_id': modGroup['id'],
                                        });
                                      } else {
                                        _selectedModifiers.removeWhere((m) => m['id'] == opt['id']);
                                      }
                                    });
                                  },
                                );
                              }),
                              const SizedBox(height: 12),
                            ],
                          );
                        }),
                      ],

                      // Item Note
                      const Text(
                        'Catatan Khusus (Opsional)',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 8),
                      TextField(
                        controller: _noteController,
                        decoration: const InputDecoration(
                          hintText: 'Contoh: Kurang manis, es sedikit, tidak pedas',
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              const Divider(height: 24),

              // Total & Confirm Button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Total Harga Item', style: TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                      Text(
                        CurrencyFormatter.format(_totalPrice),
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                  ElevatedButton(
                    onPressed: () {
                      widget.onConfirm(
                        variantId: _selectedVariant?['id'] as int?,
                        variantName: _selectedVariant?['name'] as String?,
                        unitPrice: _basePrice,
                        selectedModifiers: _selectedModifiers,
                        note: _noteController.text.trim().isNotEmpty
                            ? _noteController.text.trim()
                            : null,
                      );
                      Navigator.of(context).pop();
                    },
                    child: const Text('Tambah ke Pesanan'),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
