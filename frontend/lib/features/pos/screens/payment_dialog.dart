import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/pos_provider.dart';
import 'receipt_dialog.dart';

class PaymentDialog extends StatefulWidget {
  final double totalAmount;

  const PaymentDialog({
    super.key,
    required this.totalAmount,
  });

  @override
  State<PaymentDialog> createState() => _PaymentDialogState();
}

class _PaymentDialogState extends State<PaymentDialog> {
  String _selectedMethod = 'CASH';
  final _amountPaidController = TextEditingController();
  final _noteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _amountPaidController.text = widget.totalAmount.toStringAsFixed(0);
  }

  @override
  void dispose() {
    _amountPaidController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  double get _amountPaid {
    return double.tryParse(_amountPaidController.text) ?? 0.0;
  }

  double get _change {
    if (_amountPaid < widget.totalAmount) return 0.0;
    return _amountPaid - widget.totalAmount;
  }

  Future<void> _processPayment() async {
    if (_selectedMethod == 'CASH' && _amountPaid < widget.totalAmount) {
      UiHelpers.showSnackBar(
        context,
        'Jumlah uang tunai tidak boleh kurang dari total tagihan',
        isError: true,
      );
      return;
    }

    final posProvider = context.read<PosProvider>();

    try {
      final receiptData = await posProvider.checkout(
        paymentMethod: _selectedMethod,
        amountPaid: _selectedMethod == 'CASH' ? _amountPaid : widget.totalAmount,
        transactionNote: _noteController.text.trim().isNotEmpty
            ? _noteController.text.trim()
            : null,
      );

      if (!mounted) return;
      Navigator.of(context).pop(); // close payment dialog

      // Show Receipt Dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (_) => ReceiptDialog(transaction: receiptData),
      );
    } catch (e) {
      if (mounted) {
        UiHelpers.showSnackBar(context, 'Pembayaran gagal: $e', isError: true);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final posProvider = context.watch<PosProvider>();

    final quickNominals = [
      widget.totalAmount,
      (widget.totalAmount / 10000).ceil() * 10000.0,
      (widget.totalAmount / 50000).ceil() * 50000.0,
      100000.0,
    ].toSet().where((val) => val >= widget.totalAmount).toList();

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Pilih Metode Pembayaran',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const Divider(height: 20),

              // Total Bill Box
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'TOTAL TAGIHAN',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 13,
                        color: AppColors.primaryDark,
                      ),
                    ),
                    Text(
                      CurrencyFormatter.format(widget.totalAmount),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 22,
                        color: AppColors.primaryDark,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Payment Methods Grid
              const Text(
                'Metode Pembayaran',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildMethodTile('CASH', Icons.money_rounded, 'Tunai'),
                  const SizedBox(width: 8),
                  _buildMethodTile('QRIS', Icons.qr_code_2_rounded, 'QRIS'),
                  const SizedBox(width: 8),
                  _buildMethodTile('TRANSFER', Icons.account_balance_rounded, 'Transfer'),
                  const SizedBox(width: 8),
                  _buildMethodTile('DEBIT', Icons.credit_card_rounded, 'Debit'),
                ],
              ),
              const SizedBox(height: 18),

              // Cash Nominal & Change Calculator
              if (_selectedMethod == 'CASH') ...[
                const Text(
                  'Uang Diterima (Rp)',
                  style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 6),
                TextField(
                  controller: _amountPaidController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    prefixText: 'Rp ',
                    hintText: '0',
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  children: quickNominals.map((nom) {
                    return ActionChip(
                      label: Text(CurrencyFormatter.format(nom)),
                      onPressed: () {
                        setState(() {
                          _amountPaidController.text = nom.toStringAsFixed(0);
                        });
                      },
                    );
                  }).toList(),
                ),
                const SizedBox(height: 14),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: AppColors.background,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Uang Kembalian:',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                      ),
                      Text(
                        CurrencyFormatter.format(_change),
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: _change > 0 ? AppColors.success : AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
              ],

              // Transaction Note
              TextField(
                controller: _noteController,
                decoration: const InputDecoration(
                  labelText: 'Catatan Transaksi / Nama Pelanggan (Opsional)',
                  hintText: 'Contoh: Meja 4 / Bpk Joko / Tanpa Es',
                ),
              ),
              const SizedBox(height: 24),

              // Pay Button
              ElevatedButton(
                onPressed: posProvider.isLoading ? null : _processPayment,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
                child: posProvider.isLoading
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : Text(
                        'Selesaikan Pembayaran (${CurrencyFormatter.format(widget.totalAmount)})',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMethodTile(String method, IconData icon, String label) {
    final isSelected = _selectedMethod == method;
    return Expanded(
      child: InkWell(
        onTap: () {
          setState(() {
            _selectedMethod = method;
            if (method != 'CASH') {
              _amountPaidController.text = widget.totalAmount.toStringAsFixed(0);
            }
          });
        },
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryContainer : AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.cardBorder,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            children: [
              Icon(
                icon,
                color: isSelected ? AppColors.primary : AppColors.textSecondary,
                size: 24,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                style: TextStyle(
                  fontSize: 12,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                  color: isSelected ? AppColors.primary : AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
