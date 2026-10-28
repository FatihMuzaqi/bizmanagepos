import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../providers/report_provider.dart';
import '../services/report_export_service.dart';

class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final Map<String, String> _presets = {
    'today': 'Hari Ini',
    'yesterday': 'Kemarin',
    'this_week': 'Minggu Ini',
    'this_month': 'Bulan Ini',
    'last_month': 'Bulan Lalu',
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 4, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _loadReports();
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _loadReports() {
    final rep = context.read<ReportProvider>();
    rep.fetchDashboard();
    rep.fetchSalesReport();
    rep.fetchProductReport();
    rep.fetchOutletReport();
    rep.fetchExpenseReport();
  }

  @override
  Widget build(BuildContext context) {
    final repProvider = context.watch<ReportProvider>();

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Laporan Penjualan & Keuangan'),
        actions: [
          IconButton(
            icon: const Icon(Icons.file_download_outlined),
            tooltip: 'Export Laporan',
            onPressed: () => _showExportModal(context, repProvider),
          ),
          const SizedBox(width: 8),
        ],
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Ringkasan & Omset'),
            Tab(text: 'Performa Menu'),
            Tab(text: 'Performa Cabang'),
            Tab(text: 'Rincian Pengeluaran'),
          ],
        ),
      ),
      body: Column(
        children: [
          // Date Filter Toolbar
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            color: AppColors.surface,
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ..._presets.entries.map((entry) {
                    final isSelected = repProvider.selectedPreset == entry.key;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(entry.value),
                        selected: isSelected,
                        selectedColor: AppColors.primaryContainer,
                        labelStyle: TextStyle(
                          color: isSelected ? AppColors.primary : AppColors.textPrimary,
                          fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        ),
                        onSelected: (val) {
                          if (val) {
                            repProvider.setFilterPreset(entry.key);
                            _loadReports();
                          }
                        },
                      ),
                    );
                  }),
                  const SizedBox(width: 6),
                  ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      elevation: 0,
                    ),
                    icon: const Icon(Icons.file_download_rounded, size: 17),
                    label: const Text('Export Laporan', style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold)),
                    onPressed: () => _showExportModal(context, repProvider),
                  ),
                ],
              ),
            ),
          ),
          const Divider(height: 1),

          // Tab View
          Expanded(
            child: repProvider.isLoading
                ? const Center(child: CircularProgressIndicator())
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildSummaryTab(repProvider),
                      _buildProductTab(repProvider),
                      _buildOutletTab(repProvider),
                      _buildExpenseTab(repProvider),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryTab(ReportProvider rep) {
    final dashboard = rep.dashboardData;
    final sales = rep.salesReport;

    final salesToday = dashboard?['sales_today'] ?? 0;
    final txCount = dashboard?['transactions_today'] ?? 0;
    final expensesToday = dashboard?['expenses_today'] ?? 0;
    final netIncome = dashboard?['net_income_today'] ?? (salesToday - expensesToday);
    final avgOrder = sales?['average_transaction'] ?? 0;
    final paymentMethods = (sales?['payment_methods'] as List? ?? []).cast<Map<String, dynamic>>();

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // 4 KPI Summary Cards
          Row(
            children: [
              Expanded(child: _buildMetricCard('Total Omset', CurrencyFormatter.format(salesToday), Icons.trending_up_rounded, AppColors.success)),
              const SizedBox(width: 12),
              Expanded(child: _buildMetricCard('Total Pesanan', '$txCount Pesanan', Icons.receipt_long_rounded, AppColors.secondary)),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(child: _buildMetricCard('Total Pengeluaran', CurrencyFormatter.format(expensesToday), Icons.trending_down_rounded, AppColors.error)),
              const SizedBox(width: 12),
              Expanded(child: _buildMetricCard('Laba Bersih', CurrencyFormatter.format(netIncome), Icons.account_balance_wallet_rounded, AppColors.primary)),
            ],
          ),
          const SizedBox(height: 20),

          // Average Order Card
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Rata-rata Penjualan / Nota:', style: TextStyle(fontWeight: FontWeight.w600)),
                  Text(CurrencyFormatter.format(avgOrder), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Payment Methods Distribution
          const Text('Metode Pembayaran Digunakan', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const SizedBox(height: 10),
          if (paymentMethods.isEmpty)
            const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Tidak ada data pembayaran pada periode ini')))
          else
            ...paymentMethods.map((pm) {
              final method = pm['method'] ?? 'CASH';
              final count = pm['count'] ?? 0;
              final amount = pm['total_amount'] ?? 0;
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppColors.primaryContainer,
                    child: Text(method[0], style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
                  ),
                  title: Text(method, style: const TextStyle(fontWeight: FontWeight.bold)),
                  subtitle: Text('$count transaksi'),
                  trailing: Text(CurrencyFormatter.format(amount), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildProductTab(ReportProvider rep) {
    final products = rep.productReport;
    if (products.isEmpty) {
      return const Center(child: Text('Tidak ada data penjualan produk pada rentang tanggal ini'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: products.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, index) {
        final p = products[index];
        final name = p['product_name'] ?? 'Menu / Produk';
        final qty = p['quantity_sold'] ?? 0;
        final revenue = p['revenue'] ?? 0;
        final orders = p['order_count'] ?? 0;

        return Card(
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.primaryContainer,
              child: Text('${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.primary)),
            ),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Terjual: $qty porsi ($orders pesanan)'),
            trailing: Text(CurrencyFormatter.format(revenue), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.primary)),
          ),
        );
      },
    );
  }

  Widget _buildOutletTab(ReportProvider rep) {
    final outlets = rep.outletReport;
    if (outlets.isEmpty) {
      return const Center(child: Text('Tidak ada data cabang yang tersedia'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: outlets.length,
      separatorBuilder: (_, __) => const SizedBox(height: 10),
      itemBuilder: (ctx, index) {
        final o = outlets[index];
        final name = o['name'] ?? 'Cabang';
        final code = o['code'] ?? '';
        final sales = o['sales'] ?? 0;
        final expenses = o['expense'] ?? 0;
        final profit = o['net_profit'] ?? (sales - expenses);

        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    if (code.isNotEmpty)
                      Chip(label: Text(code), visualDensity: VisualDensity.compact),
                  ],
                ),
                const Divider(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total Penjualan:'),
                    Text(CurrencyFormatter.format(sales), style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Biaya Operasional:'),
                    Text('- ${CurrencyFormatter.format(expenses)}', style: const TextStyle(color: AppColors.error, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Laba Bersih:', style: TextStyle(fontWeight: FontWeight.bold)),
                    Text(CurrencyFormatter.format(profit), style: const TextStyle(color: AppColors.primary, fontWeight: FontWeight.bold, fontSize: 16)),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildExpenseTab(ReportProvider rep) {
    final expenseData = rep.expenseReport;
    final categories = (expenseData?['categories'] as List? ?? []).cast<Map<String, dynamic>>();

    if (categories.isEmpty) {
      return const Center(child: Text('Tidak ada catatan pengeluaran pada rentang tanggal ini'));
    }

    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: categories.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (ctx, index) {
        final cat = categories[index];
        final name = cat['category_name'] ?? 'Kategori Biaya';
        final total = cat['total_expense'] ?? 0;
        final count = cat['expense_count'] ?? 0;

        return Card(
          child: ListTile(
            leading: const CircleAvatar(
              backgroundColor: AppColors.errorContainer,
              child: Icon(Icons.pie_chart_rounded, color: AppColors.error, size: 20),
            ),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('$count catatan pengeluaran'),
            trailing: Text(CurrencyFormatter.format(total), style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: AppColors.error)),
          ),
        );
      },
    );
  }

  Widget _buildMetricCard(String title, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 18, color: color),
              const SizedBox(width: 6),
              Text(title, style: const TextStyle(fontSize: 12, color: AppColors.textSecondary, fontWeight: FontWeight.w500)),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: color),
          ),
        ],
      ),
    );
  }

  void _showExportModal(BuildContext context, ReportProvider repProvider) {
    final presetName = ReportExportService.getPresetLabel(repProvider.selectedPreset);

    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: Colors.grey.shade300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.primaryContainer,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.file_download_rounded, color: AppColors.primary, size: 24),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Export Laporan Penjualan & Keuangan',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Periode aktif: $presetName',
                        style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            // Option 1: PDF Document
            _buildExportOptionTile(
              icon: Icons.picture_as_pdf_rounded,
              iconColor: const Color(0xFFEF4444),
              iconBgColor: const Color(0xFFFEE2E2),
              title: 'Export Dokumen PDF (.pdf)',
              subtitle: 'Dokumen formal siap cetak, simpan ke file, atau bagikan via WhatsApp / Email',
              badgeText: 'Siap Cetak',
              badgeColor: const Color(0xFFEF4444),
              onTap: () {
                Navigator.of(ctx).pop();
                ReportExportService.exportPdf(context: context, rep: repProvider);
              },
            ),
            const SizedBox(height: 10),

            // Option 2: Excel Spreadsheet (.xls)
            _buildExportOptionTile(
              icon: Icons.table_chart_rounded,
              iconColor: const Color(0xFF10B981),
              iconBgColor: const Color(0xFFECFDF5),
              title: 'Export Spreadsheet Excel (.xls)',
              subtitle: 'Buku kerja multi-sheet: Ringkasan, Menu Produk, Cabang, dan Pengeluaran',
              badgeText: 'Multi-Sheet',
              badgeColor: const Color(0xFF10B981),
              onTap: () {
                Navigator.of(ctx).pop();
                ReportExportService.exportExcel(context: context, rep: repProvider);
              },
            ),
            const SizedBox(height: 10),

            // Option 3: Universal CSV (.csv)
            _buildExportOptionTile(
              icon: Icons.description_outlined,
              iconColor: const Color(0xFF0066FF),
              iconBgColor: const Color(0xFFEFF6FF),
              title: 'Export Format CSV (.csv)',
              subtitle: 'Data tabel universal UTF-8 untuk software akuntansi & Google Sheets',
              badgeText: 'Data Mentah',
              badgeColor: const Color(0xFF0066FF),
              onTap: () {
                Navigator.of(ctx).pop();
                ReportExportService.exportCsv(context: context, rep: repProvider);
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildExportOptionTile({
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String title,
    required String subtitle,
    required String badgeText,
    required Color badgeColor,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppColors.cardBorder),
        ),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: iconBgColor,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: iconColor, size: 24),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          title,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13.5),
                        ),
                      ),
                      const SizedBox(width: 6),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                        decoration: BoxDecoration(
                          color: badgeColor.withValues(alpha: 0.12),
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          badgeText,
                          style: TextStyle(color: badgeColor, fontSize: 9.5, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11.5, color: AppColors.textSecondary, height: 1.25),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.textTertiary),
          ],
        ),
      ),
    );
  }
}
