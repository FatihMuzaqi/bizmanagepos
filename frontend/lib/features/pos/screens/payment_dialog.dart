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

    final quickNominals = <double>{
      widget.totalAmount,
      (widget.totalAmount / 10000).ceil() * 10000.0,
      (widget.totalAmount / 50000).ceil() * 50000.0,
      100000.0,
    }.where((val) => val >= widget.totalAmount).toList();

    return Dialog(
      insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 480),
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Header
              Row(
                children: [
                  const Expanded(
                    child: Text(
                      'Pilih Metode Pembayaran',
                      style: TextStyle(fontSize: 17, fontWeight: FontWeight.bold),
                    ),
                  ),
                  IconButton(
                    visualDensity: VisualDensity.compact,
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              const Divider(height: 16),

              // Total Bill Box
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
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
                        fontSize: 12,
                        color: AppColors.primaryDark,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Text(
                        CurrencyFormatter.format(widget.totalAmount),
                        textAlign: TextAlign.end,
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 20,
                          color: AppColors.primaryDark,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Payment Methods Grid
              const Text(
                'Metode Pembayaran',
                style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _buildMethodTile('CASH', Icons.money_rounded, 'Tunai'),
                  const SizedBox(width: 6),
                  _buildMethodTile('QRIS', Icons.qr_code_2_rounded, 'QRIS'),
                  const SizedBox(width: 6),
                  _buildMethodTile('TRANSFER', Icons.account_balance_rounded, 'Transfer'),
                  const SizedBox(width: 6),
                  _buildMethodTile('DEBIT', Icons.credit_card_rounded, 'Debit'),
                ],
              ),
              const SizedBox(height: 16),

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
                    contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
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
                const SizedBox(height: 12),
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
                  contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
              const SizedBox(height: 20),

              // Pay Button
              ElevatedButton(
                onPressed: posProvider.isLoading ? null : _processPayment,
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
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
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
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
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primaryContainer : AppColors.surface,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.cardBorder,
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                icon,
                color: isSelected ? AppColors.primary : AppColors.textSecondary,
                size: 22,
              ),
              const SizedBox(height: 4),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: 11,
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
