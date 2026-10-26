import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/ui_helpers.dart';

class ReceiptDialog extends StatelessWidget {
  final Map<String, dynamic> transaction;

  const ReceiptDialog({
    super.key,
    required this.transaction,
  });

  double _toDouble(dynamic val) {
    if (val == null) return 0.0;
    if (val is num) return val.toDouble();
    if (val is String) return double.tryParse(val) ?? 0.0;
    return 0.0;
  }

  @override
  Widget build(BuildContext context) {
    final invoiceNo = transaction['invoice_number'] ?? '-';
    final createdAt = transaction['created_at'] ?? transaction['createdAt'];
    final items = (transaction['items'] as List? ?? []).cast<Map<String, dynamic>>();
    final payment = transaction['payment'] as Map<String, dynamic>?;
    final numSubtotal = _toDouble(transaction['subtotal']);
    final numDiscount = _toDouble(transaction['discount']);
    final numTax = _toDouble(transaction['tax']);
    final numTotal = _toDouble(transaction['total']);
    final note = transaction['note'];
    final payMethod = payment?['method'] ?? payment?['payment_method'] ?? 'CASH';
    final paidAmount = _toDouble(payment?['paid_amount'] ?? payment?['amount_paid'] ?? numTotal);
    final changeAmount = _toDouble(payment?['change_amount'] ?? payment?['change_given'] ?? 0);

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 420, maxHeight: 680),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Success Icon & Receipt Header
              const Center(
                child: Icon(
                  Icons.check_circle_rounded,
                  color: AppColors.success,
                  size: 48,
                ),
              ),
              const SizedBox(height: 8),
              const Center(
                child: Text(
                  'Transaksi Berhasil!',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 16),

              // Thermal Receipt Look Card
              Expanded(
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: SingleChildScrollView(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Center(
                          child: Text(
                            invoiceNo,
                            style: const TextStyle(
                              fontFamily: 'monospace',
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Center(
                          child: Text(
                            DateFormatter.formatDateTime(createdAt),
                            style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                          ),
                        ),
                        const Divider(height: 20),

                        // Item Lines
                        ...items.map((item) {
                          final prodName = item['product_name'] ?? item['product']?['name'] ?? 'Item';
                          final variantName = item['variant_name'] ?? item['variant']?['name'];
                          final qty = item['quantity'] ?? 1;
                          final sub = item['subtotal'] ?? (item['unit_price'] * qty);
                          final mods = (item['modifiers'] as List? ?? []).cast<Map<String, dynamic>>();

                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        '$qty x $prodName${variantName != null ? ' ($variantName)' : ''}',
                                        style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                      ),
                                    ),
                                    Text(
                                      CurrencyFormatter.format(sub),
                                      style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                                    ),
                                  ],
                                ),
                                if (mods.isNotEmpty)
                                  Padding(
                                    padding: const EdgeInsets.only(left: 12, top: 2),
                                    child: Text(
                                      '+ ${mods.map((m) => m['option_name'] ?? m['name']).join(', ')}',
                                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                    ),
                                  ),
                              ],
                            ),
                          );
                        }),

                        const Divider(height: 20),

                        // Financial Summaries
                        _buildSummaryRow('Subtotal', CurrencyFormatter.format(numSubtotal)),
                        if (numDiscount > 0)
                          _buildSummaryRow('Diskon', '- ${CurrencyFormatter.format(numDiscount)}', isDiscount: true),
                        if (numTax > 0)
                          _buildSummaryRow('Pajak', CurrencyFormatter.format(numTax)),
                        const SizedBox(height: 4),
                        _buildSummaryRow(
                          'TOTAL BAYAR',
                          CurrencyFormatter.format(numTotal),
                          isBold: true,
                        ),
                        const Divider(height: 16),

                        // Payment Details
                        if (payment != null) ...[
                          _buildSummaryRow('Metode Pembayaran', payMethod),
                          _buildSummaryRow('Uang Diterima', CurrencyFormatter.format(paidAmount)),
                          if (changeAmount > 0)
                            _buildSummaryRow(
                              'Kembalian',
                              CurrencyFormatter.format(changeAmount),
                              isBold: true,
                            ),
                        ],

                        if (note != null && note.isNotEmpty) ...[
                          const SizedBox(height: 8),
                          Text(
                            'Catatan: $note',
                            style: const TextStyle(fontStyle: FontStyle.italic, fontSize: 12),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Action Buttons
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () {
                        UiHelpers.showSnackBar(context, 'Mencetak struk ke printer thermal...', isSuccess: true);
                      },
                      icon: const Icon(Icons.print_rounded, size: 18),
                      label: const Text('Cetak Struk'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Pesanan Baru'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value, {bool isBold = false, bool isDiscount = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isDiscount ? AppColors.error : AppColors.textPrimary,
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13,
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
              color: isDiscount ? AppColors.error : AppColors.textPrimary,
            ),
          ),
        ],
      ),
    );
  }
}
