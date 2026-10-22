import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/date_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../providers/subscription_provider.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadData();
    });
  }

  void _loadData() {
    final sub = context.read<SubscriptionProvider>();
    sub.fetchSubscriptionOverview();
    sub.fetchPlans();
    sub.fetchInvoices();
  }

  Future<void> _launchPaymentUrl(String url) async {
    final uri = Uri.parse(url);
    try {
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        if (mounted) {
          UiHelpers.showSnackBar(context, 'Tidak dapat membuka browser pembayaran.', isError: true);
        }
      }
    } catch (e) {
      if (mounted) {
        UiHelpers.showSnackBar(context, 'Gagal membuka tautan pembayaran: $e', isError: true);
      }
    }
  }

  void _showPaymentModal(Map<String, dynamic> checkout) {
    final orderId = checkout['order_id'] ?? '';
    final redirectUrl = checkout['redirect_url'] ?? '';
    final amount = checkout['amount'] ?? 30000;
    final planName = checkout['plan']?['name'] ?? 'Langganan 1 Bulan';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (modalCtx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          final subProvider = dialogCtx.watch<SubscriptionProvider>();

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            title: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.payment_rounded, color: AppColors.primary, size: 22),
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Pembayaran Midtrans', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      Text('Gateway Resmi Berlisensi BI', style: TextStyle(fontSize: 11, color: AppColors.textSecondary)),
                    ],
                  ),
                ),
              ],
            ),
            content: SizedBox(
              width: 480,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Paket:', style: TextStyle(color: AppColors.textSecondary, fontSize: 13)),
                            Text(planName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Nomor Tagihan:', style: TextStyle(color: AppColors.textSecondary, fontSize: 12)),
                            SelectableText(
                              orderId,
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: AppColors.primary),
                            ),
                          ],
                        ),
                        const Divider(height: 20),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Total Pembayaran:', style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                            Text(
                              CurrencyFormatter.format(amount),
                              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppColors.primary),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Payment instructions & badge
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.infoContainer,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Icon(Icons.info_outline_rounded, color: AppColors.info, size: 20),
                        SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'Mendukung QRIS (GoPay, OVO, Dana, ShopeePay), Transfer Bank (BCA, Mandiri, BNI, BRI), & Kartu Kredit. Klik tombol di bawah untuk membayar.',
                            style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),

                  // Action 1: Open Midtrans Snap Webview/Browser
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () => _launchPaymentUrl(redirectUrl),
                    icon: const Icon(Icons.open_in_new_rounded, size: 18),
                    label: const Text('Buka Halaman Bayar Midtrans', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                  const SizedBox(height: 10),

                  // Action 2: Check status directly
                  OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: subProvider.isLoading
                        ? null
                        : () async {
                            try {
                              final statusRes = await subProvider.checkPayment(orderId);
                              if (!mounted) return;
                              if (statusRes['status'] == 'PAID') {
                                if (modalCtx.mounted) {
                                  Navigator.of(modalCtx).pop();
                                }
                                UiHelpers.showSnackBar(
                                  context,
                                  'Pembayaran Berhasil! Langganan Anda telah aktif.',
                                  isSuccess: true,
                                );
                              } else {
                                UiHelpers.showSnackBar(
                                  context,
                                  'Status Tagihan: ${statusRes['status']}. Silakan selesaikan pembayaran.',
                                  isError: false,
                                );
                              }
                            } catch (err) {
                              if (!mounted) return;
                              UiHelpers.showSnackBar(context, 'Gagal memeriksa status: $err', isError: true);
                            }
                          },
                    icon: subProvider.isLoading
                        ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.sync_rounded, size: 18),
                    label: const Text('Cek Status Pembayaran'),
                  ),
                ],
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(modalCtx).pop(),
                child: const Text('Tutup (Bayar Nanti)'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showUpgradeDialog() {
    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (dialogCtx, setDialogState) {
          final subProvider = dialogCtx.watch<SubscriptionProvider>();
          final plans = subProvider.plans;

          return AlertDialog(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            title: const Text('Pilih Paket Langganan'),
            content: SizedBox(
              width: 540,
              height: 480,
              child: ListView.separated(
                itemCount: plans.length,
                separatorBuilder: (_, __) => const SizedBox(height: 12),
                itemBuilder: (listCtx, index) {
                  final p = plans[index];
                  final id = p['id'] as int;
                  final name = p['name'] ?? '';
                  final price = p['price'] ?? 0;
                  final desc = p['description'] ?? '';
                  final isCurrent = subProvider.plan?['id'] == id;

                  return Card(
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: BorderSide(
                        color: isCurrent ? AppColors.primary : AppColors.cardBorder,
                        width: isCurrent ? 2 : 1,
                      ),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                              Text(
                                price == 0 ? 'Gratis' : '${CurrencyFormatter.format(price)} / bln',
                                style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary),
                              ),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(desc, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary)),
                          const SizedBox(height: 12),
                          Wrap(
                            spacing: 8,
                            children: [
                              _buildLimitBadge('Staf: ${p['max_users'] == -1 ? 'Bisa Akses Semua' : p['max_users']}'),
                              _buildLimitBadge('Cabang: ${p['max_outlets'] == -1 ? 'Bisa Akses Semua' : p['max_outlets']}'),
                              _buildLimitBadge('Menu: ${p['max_products'] == -1 ? 'Bisa Akses Semua' : p['max_products']}'),
                              _buildLimitBadge('Transaksi: ${p['max_transactions'] == -1 ? 'Bisa Akses Semua' : p['max_transactions']}'),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Align(
                            alignment: Alignment.centerRight,
                            child: ElevatedButton(
                              onPressed: isCurrent
                                  ? null
                                  : () async {
                                      Navigator.of(ctx).pop();
                                      if (price == 0) {
                                        try {
                                          await subProvider.upgradePlan(id);
                                          if (!mounted) return;
                                          UiHelpers.showSnackBar(
                                            context,
                                            'Berhasil beralih ke paket $name!',
                                            isSuccess: true,
                                          );
                                        } catch (e) {
                                          if (!mounted) return;
                                          UiHelpers.showSnackBar(
                                            context,
                                            'Gagal memperbarui langganan: $e',
                                            isError: true,
                                          );
                                        }
                                      } else {
                                        // Paid subscription with Midtrans
                                        try {
                                          final checkoutData = await subProvider.createCheckout(id);
                                          if (!mounted) return;
                                          _showPaymentModal(checkoutData);
                                        } catch (e) {
                                          if (!mounted) return;
                                          UiHelpers.showSnackBar(
                                            context,
                                            'Gagal menyiapkan pembayaran: $e',
                                            isError: true,
                                          );
                                        }
                                      }
                                    },
                              child: Text(isCurrent
                                  ? 'Sedang Digunakan'
                                  : (price == 0 ? 'Pilih Uji Coba' : 'Langganan Rp 30.000 / Bulan')),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(ctx).pop(), child: const Text('Tutup')),
            ],
          );
        },
      ),
    );
  }

  static Widget _buildLimitBadge(String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Text(text, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w500)),
    );
  }

  @override
  Widget build(BuildContext context) {
    final subProvider = context.watch<SubscriptionProvider>();
    final sub = subProvider.subscription;
    final plan = subProvider.plan;
    final usage = subProvider.usage;
    final invoices = subProvider.invoices;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Paket Langganan & Kuota'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadData,
          ),
        ],
      ),
      body: subProvider.isLoading && sub == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 750),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Status Banner
                      if (subProvider.isTrial)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.infoContainer,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.info.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.stars_rounded, color: AppColors.info, size: 30),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text(
                                      'Masa Uji Coba Gratis 1 Bulan Aktif',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.info),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      'Anda mendapatkan akses penuh ke seluruh fitur (cabang, staf, menu, & transaksi tanpa batas) sampai ${DateFormatter.formatDate(sub?['trial_ends_at'] ?? sub?['ends_at'])}. Di bulan ke-2, lanjutkan langganan hanya Rp 30.000 / bulan untuk tetap mengakses semua fitur.',
                                      style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        )
                      else if (subProvider.isExpired)
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.errorContainer,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.error.withValues(alpha: 0.3)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.warning_amber_rounded, color: AppColors.error, size: 30),
                              const SizedBox(width: 14),
                              const Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      'Masa Uji Coba Gratis 1 Bulan Telah Berakhir',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: AppColors.error),
                                    ),
                                    SizedBox(height: 4),
                                    Text(
                                      'Silakan lanjutkan Langganan (hanya Rp 30.000 / bulan) via Midtrans untuk tetap mengakses seluruh fitur (cabang, staf, menu, transaksi) tanpa batasan.',
                                      style: TextStyle(fontSize: 12, color: AppColors.textSecondary, height: 1.4),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      const SizedBox(height: 16),

                      // Current Plan Card
                      Card(
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: const BorderSide(color: AppColors.cardBorder),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        plan?['name'] ?? 'Paket Uji Coba Gratis',
                                        style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        'Status: ${sub?['status'] == 'ACTIVE' ? 'AKTIF' : (sub?['status'] ?? 'AKTIF')}',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 13,
                                          color: subProvider.isExpired ? AppColors.error : AppColors.success,
                                        ),
                                      ),
                                    ],
                                  ),
                                  ElevatedButton.icon(
                                    onPressed: _showUpgradeDialog,
                                    icon: const Icon(Icons.payment_rounded, size: 18),
                                    label: const Text('Kelola / Bayar Langganan'),
                                  ),
                                ],
                              ),
                              const Divider(height: 24),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  const Text('Periode Aktif:', style: TextStyle(color: AppColors.textSecondary)),
                                  Text(
                                    '${DateFormatter.formatDate(sub?['starts_at'])} – ${DateFormatter.formatDate(sub?['ends_at'])}',
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),

                      // Quotas & Usage Progress
                      const Text(
                        'Penggunaan Kapasitas & Batasan',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 12),

                      _buildUsageMeter(
                        title: 'Jumlah Anggota Tim / Kasir',
                        current: usage?['users']?['current'] ?? 1,
                        max: usage?['users']?['max'] ?? -1,
                        icon: Icons.people_outline_rounded,
                      ),
                      const SizedBox(height: 12),
                      _buildUsageMeter(
                        title: 'Jumlah Cabang / Outlet',
                        current: usage?['outlets']?['current'] ?? 1,
                        max: usage?['outlets']?['max'] ?? 2,
                        icon: Icons.storefront_outlined,
                      ),
                      const SizedBox(height: 12),
                      _buildUsageMeter(
                        title: 'Jumlah Produk / Menu',
                        current: usage?['products']?['current'] ?? 0,
                        max: usage?['products']?['max'] ?? -1,
                        icon: Icons.inventory_2_outlined,
                      ),
                      const SizedBox(height: 12),
                      _buildUsageMeter(
                        title: 'Transaksi Kasir Bulanan',
                        current: usage?['transactions']?['current'] ?? 0,
                        max: usage?['transactions']?['max'] ?? -1,
                        icon: Icons.receipt_long_outlined,
                      ),

                      const SizedBox(height: 32),

                      // Invoices & Billing History Section
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Riwayat Pembayaran & Tagihan (Midtrans)',
                            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                          ),
                          IconButton(
                            icon: const Icon(Icons.refresh_rounded, size: 20),
                            onPressed: () => subProvider.fetchInvoices(),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),

                      if (invoices.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(24),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: const Center(
                            child: Text(
                              'Belum ada riwayat tagihan. Klik "Kelola / Bayar Langganan" untuk memulai langganan.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 13, color: AppColors.textSecondary),
                            ),
                          ),
                        )
                      else
                        ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: invoices.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 10),
                          itemBuilder: (ctx, idx) {
                            final inv = invoices[idx];
                            final invOrderId = inv['order_id'] ?? '';
                            final invAmount = inv['amount'] ?? 0;
                            final invStatus = inv['status'] ?? 'PENDING';
                            final invPaidAt = inv['paid_at'];
                            final invCreatedAt = inv['createdAt'];
                            final isPending = invStatus == 'PENDING';
                            final isPaid = invStatus == 'PAID';

                            Color statusColor = AppColors.warning;
                            String statusLabel = 'MENUNGGU PEMBAYARAN';
                            if (isPaid) {
                              statusColor = AppColors.success;
                              statusLabel = 'LUNAS (TERVERIFIKASI)';
                            } else if (invStatus == 'EXPIRED') {
                              statusColor = AppColors.error;
                              statusLabel = 'KADALUARSA';
                            } else if (invStatus == 'FAILED' || invStatus == 'CANCELLED') {
                              statusColor = AppColors.error;
                              statusLabel = 'BATAL / GAGAL';
                            }

                            return Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: AppColors.surface,
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: AppColors.cardBorder),
                              ),
                              child: Row(
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: statusColor.withValues(alpha: 0.1),
                                      borderRadius: BorderRadius.circular(10),
                                    ),
                                    child: Icon(
                                      isPaid ? Icons.check_circle_rounded : Icons.pending_rounded,
                                      color: statusColor,
                                      size: 24,
                                    ),
                                  ),
                                  const SizedBox(width: 14),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          invOrderId,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Tanggal: ${DateFormatter.formatDate(invPaidAt ?? invCreatedAt)}',
                                          style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                                        ),
                                        const SizedBox(height: 4),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                          decoration: BoxDecoration(
                                            color: statusColor.withValues(alpha: 0.15),
                                            borderRadius: BorderRadius.circular(4),
                                          ),
                                          child: Text(
                                            statusLabel,
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: statusColor,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                  Column(
                                    crossAxisAlignment: CrossAxisAlignment.end,
                                    children: [
                                      Text(
                                        CurrencyFormatter.format(invAmount),
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                      ),
                                      if (isPending) ...[
                                        const SizedBox(height: 6),
                                        ElevatedButton(
                                          style: ElevatedButton.styleFrom(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                            minimumSize: Size.zero,
                                            tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                          ),
                                          onPressed: () {
                                            _showPaymentModal({
                                              'order_id': invOrderId,
                                              'redirect_url': inv['snap_redirect_url'],
                                              'amount': invAmount,
                                              'plan': inv['plan']
                                            });
                                          },
                                          child: const Text('Bayar Sekarang', style: TextStyle(fontSize: 11)),
                                        ),
                                      ],
                                    ],
                                  ),
                                ],
                              ),
                            );
                          },
                        ),

                      const SizedBox(height: 40),
                    ],
                  ),
                ),
              ),
            ),
    );
  }

  Widget _buildUsageMeter({
    required String title,
    required int current,
    required int max,
    required IconData icon,
  }) {
    final isUnlimited = max == -1;
    final ratio = isUnlimited ? 0.0 : (max > 0 ? (current / max).clamp(0.0, 1.0) : 0.0);
    final isFull = !isUnlimited && current >= max;

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: isFull ? AppColors.error : AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20, color: isFull ? AppColors.error : AppColors.primary),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
              ),
              Text(
                isUnlimited ? '$current / Tak Terbatas' : '$current / $max',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                  color: isFull ? AppColors.error : AppColors.textPrimary,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          LinearProgressIndicator(
            value: isUnlimited ? 0.05 : ratio,
            backgroundColor: AppColors.background,
            valueColor: AlwaysStoppedAnimation<Color>(
              isFull ? AppColors.error : (ratio > 0.8 ? AppColors.warning : AppColors.primary),
            ),
            borderRadius: BorderRadius.circular(4),
            minHeight: 6,
          ),
        ],
      ),
    );
  }
}
