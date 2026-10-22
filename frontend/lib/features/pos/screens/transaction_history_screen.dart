import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/pos_provider.dart';
import 'receipt_dialog.dart';

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  String? _statusFilter;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<PosProvider>().fetchTransactionHistory();
    });
  }

  void _onCancelTransaction(int txId, String invoiceNo) async {
    final reasonController = TextEditingController();
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Batalkan Transaksi $invoiceNo?'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Membatalkan transaksi ini akan mengembalikan pembayaran dan memulihkan stok bahan baku sesuai resep menu.',
              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: reasonController,
              decoration: const InputDecoration(
                labelText: 'Alasan Pembatalan',
                hintText: 'Contoh: Pelanggan salah pesan / batal beli',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Jangan Batalkan'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.error,
              foregroundColor: Colors.white,
            ),
            child: const Text('Batalkan & Pulihkan Stok'),
          ),
        ],
      ),
    );

    if (confirmed == true && mounted) {
      try {
        await context.read<PosProvider>().cancelTransaction(
              txId,
              reasonController.text.trim().isNotEmpty ? reasonController.text.trim() : null,
            );
        if (mounted) {
          UiHelpers.showSnackBar(context, 'Transaksi berhasil dibatalkan dan stok dipulihkan', isSuccess: true);
        }
      } catch (e) {
        if (mounted) {
          UiHelpers.showSnackBar(context, 'Gagal membatalkan: $e', isError: true);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final posProvider = context.watch<PosProvider>();
    final authProvider = context.watch<AuthProvider>();
    final canCancel = authProvider.hasPermission('sales.cancel');

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Riwayat Transaksi & Nota'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: () => posProvider.fetchTransactionHistory(status: _statusFilter),
          ),
        ],
      ),
      body: Column(
        children: [
          // Filter Tabs
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: AppColors.surface,
            child: Row(
              children: [
                _buildFilterChip('Semua Status', null),
                const SizedBox(width: 8),
                _buildFilterChip('Selesai', 'COMPLETED'),
                const SizedBox(width: 8),
                _buildFilterChip('Dibatalkan', 'CANCELLED'),
              ],
            ),
          ),
          const Divider(height: 1),

          // List View
          Expanded(
            child: posProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : posProvider.transactionHistory.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.receipt_long_outlined, size: 48, color: AppColors.textTertiary),
                            SizedBox(height: 12),
                            Text('Belum ada transaksi ditemukan', style: TextStyle(color: AppColors.textSecondary)),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: posProvider.transactionHistory.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, index) {
                          final tx = posProvider.transactionHistory[index];
                          final id = tx['id'] as int;
                          final invoice = tx['invoice_number'] ?? '-';
                          final status = tx['transaction_status'] ?? 'COMPLETED';
                          final isCancelled = status == 'CANCELLED';
                          final total = tx['total'] ?? 0;
                          final createdAt = tx['created_at'];
                          final payment = tx['payment'];
                          final method = payment?['payment_method'] ?? 'CASH';

                          return Card(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: const BorderSide(color: AppColors.cardBorder),
                            ),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Row(
                                children: [
                                  Container(
                                    width: 44,
                                    height: 44,
                                    decoration: BoxDecoration(
                                      color: isCancelled
                                          ? AppColors.errorContainer
                                          : AppColors.successContainer,
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(
                                      isCancelled
                                          ? Icons.cancel_outlined
                                          : Icons.receipt_long_rounded,
                                      color: isCancelled ? AppColors.error : AppColors.success,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Text(
                                              invoice,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 14,
                                                fontFamily: 'monospace',
                                              ),
                                            ),
                                            const SizedBox(width: 8),
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: isCancelled
                                                    ? AppColors.errorContainer
                                                    : AppColors.successContainer,
                                                borderRadius: BorderRadius.circular(4),
                                              ),
                                              child: Text(
                                                isCancelled ? 'BATAL' : 'SELESAI',
                                                style: TextStyle(
                                                  fontSize: 10,
                                                  fontWeight: FontWeight.bold,
                                                  color: isCancelled ? AppColors.error : AppColors.success,
                                                ),
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          '${DateFormatter.formatDateTime(createdAt)} • $method',
                                          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Text(
                                    CurrencyFormatter.format(total),
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                      color: isCancelled ? AppColors.textTertiary : AppColors.textPrimary,
                                      decoration: isCancelled ? TextDecoration.lineThrough : null,
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  PopupMenuButton<String>(
                                    icon: const Icon(Icons.more_vert, size: 20),
                                    onSelected: (action) {
                                      if (action == 'view') {
                                        showDialog(
                                          context: context,
                                          builder: (_) => ReceiptDialog(transaction: tx),
                                        );
                                      } else if (action == 'cancel') {
                                        _onCancelTransaction(id, invoice);
                                      }
                                    },
                                    itemBuilder: (_) => [
                                      const PopupMenuItem(
                                        value: 'view',
                                        child: Row(
                                          children: [
                                            Icon(Icons.visibility_outlined, size: 18),
                                            SizedBox(width: 8),
                                            Text('Lihat Struk'),
                                          ],
                                        ),
                                      ),
                                      if (!isCancelled && canCancel)
                                        const PopupMenuItem(
                                          value: 'cancel',
                                          child: Row(
                                            children: [
                                              Icon(Icons.cancel_outlined, size: 18, color: AppColors.error),
                                              SizedBox(width: 8),
                                              Text('Batalkan Pesanan', style: TextStyle(color: AppColors.error)),
                                            ],
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
      ),
    );
  }

  Widget _buildFilterChip(String label, String? status) {
    final isSelected = _statusFilter == status;
    return ChoiceChip(
      label: Text(label),
      selected: isSelected,
      selectedColor: AppColors.primaryContainer,
      labelStyle: TextStyle(
        color: isSelected ? AppColors.primary : AppColors.textPrimary,
        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
      ),
      onSelected: (val) {
        setState(() {
          _statusFilter = status;
        });
        context.read<PosProvider>().fetchTransactionHistory(status: _statusFilter);
      },
    );
  }
}
