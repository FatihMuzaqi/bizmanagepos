import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/currency_formatter.dart';
import '../../../core/utils/ui_helpers.dart';
import '../../authentication/screens/login_screen.dart';
import '../../business/providers/business_provider.dart';
import '../../business/screens/business_selector_screen.dart';
import '../../business/screens/business_settings_screen.dart';
import '../../expenses/screens/expense_screen.dart';
import '../../inventory/screens/inventory_screen.dart';
import '../../outlet/providers/outlet_provider.dart';
import '../../outlet/screens/outlet_list_screen.dart';
import '../../outlet/screens/outlet_selector_screen.dart';
import '../../pos/providers/pos_provider.dart';
import '../../pos/screens/pos_screen.dart';
import '../../pos/screens/transaction_history_screen.dart';
import '../../products/screens/category_management_screen.dart';
import '../../products/screens/modifier_management_screen.dart';
import '../../products/screens/product_list_screen.dart';
import '../../reports/providers/report_provider.dart';
import '../../reports/screens/report_screen.dart';
import '../../subscription/screens/subscription_screen.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  int _selectedIndex = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<ReportProvider>().fetchDashboard();
    });
  }

  void _switchTab(int index) {
    setState(() {
      _selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = context.watch<AuthProvider>();
    final businessProvider = context.watch<BusinessProvider>();
    final outletProvider = context.watch<OutletProvider>();
    final posProvider = context.watch<PosProvider>();
    final isDesktop = MediaQuery.of(context).size.width >= 900;

    // The 5 primary modern mobile destinations
    final primaryTabs = _buildPrimaryTabs(authProvider);

    if (_selectedIndex >= primaryTabs.length) {
      _selectedIndex = 0;
    }

    final activeTab = primaryTabs.isNotEmpty ? primaryTabs[_selectedIndex] : null;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        elevation: 0,
        scrolledUnderElevation: 1,
        backgroundColor: AppColors.surface,
        titleSpacing: 16,
        title: Row(
          children: [
            // App Logo Icon Container
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(10),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x1A0066FF),
                    blurRadius: 8,
                    offset: Offset(0, 2),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(10),
                child: Image.asset(
                  'assets/images/app_logo.png',
                  fit: BoxFit.cover,
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          businessProvider.activeBusinessName ?? 'UsahaKu POS',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                            letterSpacing: -0.3,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 4),
                      const Icon(Icons.verified_rounded, size: 14, color: AppColors.primary),
                    ],
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.accentMint,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 5),
                      Flexible(
                        child: Text(
                          outletProvider.activeOutletName ?? 'Cabang Utama',
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textSecondary,
                            fontWeight: FontWeight.w500,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
        actions: [
          // Outlet Switcher Pill Button
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: InkWell(
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const OutletSelectorScreen()),
                );
              },
              borderRadius: BorderRadius.circular(20),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: AppColors.primaryContainer,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0x330066FF)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.storefront_rounded, size: 15, color: AppColors.primary),
                    SizedBox(width: 4),
                    Text(
                      'Cabang',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                        color: AppColors.primary,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
          const SizedBox(width: 8),

          // User Profile Dropdown
          PopupMenuButton<String>(
            icon: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: AppColors.primary, width: 1.5),
              ),
              child: CircleAvatar(
                backgroundColor: AppColors.primary,
                radius: 14,
                child: Text(
                  (authProvider.user?['name'] ?? 'U')[0].toUpperCase(),
                  style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                ),
              ),
            ),
            onSelected: (val) async {
              if (val == 'switch_biz') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const BusinessSelectorScreen()),
                );
              } else if (val == 'settings') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const BusinessSettingsScreen()),
                );
              } else if (val == 'subscription') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SubscriptionScreen()),
                );
              } else if (val == 'logout') {
                final confirmed = await UiHelpers.showConfirmDialog(
                  context,
                  title: 'Keluar Akun?',
                  content: 'Apakah Anda yakin ingin keluar dari sistem UsahaKu POS?',
                );
                if (confirmed == true && context.mounted) {
                  await authProvider.logout();
                  if (!context.mounted) return;
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const LoginScreen()),
                    (route) => false,
                  );
                }
              }
            },
            itemBuilder: (_) => [
              PopupMenuItem(
                enabled: false,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      authProvider.user?['name'] ?? 'User',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    ),
                    Text(
                      authProvider.isOwner ? 'Pemilik Bisnis (Owner)' : 'Staf Kasir',
                      style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'switch_biz',
                child: Row(
                  children: [
                    Icon(Icons.swap_horiz_rounded, size: 18, color: AppColors.primary),
                    SizedBox(width: 8),
                    Text('Ganti Bisnis'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings_outlined, size: 18),
                    SizedBox(width: 8),
                    Text('Pengaturan Bisnis'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'subscription',
                child: Row(
                  children: [
                    Icon(Icons.stars_rounded, size: 18, color: AppColors.warning),
                    SizedBox(width: 8),
                    Text('Paket Langganan'),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout_rounded, size: 18, color: AppColors.error),
                    SizedBox(width: 8),
                    Text('Keluar Akun', style: TextStyle(color: AppColors.error)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Row(
        children: [
          // Sidebar on Desktop / Tablet view
          if (isDesktop && primaryTabs.isNotEmpty)
            NavigationRail(
              selectedIndex: _selectedIndex,
              onDestinationSelected: (idx) => _switchTab(idx),
              labelType: NavigationRailLabelType.all,
              backgroundColor: AppColors.surface,
              indicatorColor: AppColors.primaryContainer,
              destinations: primaryTabs.map((item) {
                return NavigationRailDestination(
                  icon: Icon(item.icon),
                  selectedIcon: Icon(item.icon, color: AppColors.primary),
                  label: Text(
                    item.label,
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w700),
                  ),
                );
              }).toList(),
            ),
          if (isDesktop) const VerticalDivider(width: 1),

          // Main View Content
          Expanded(
            child: activeTab != null ? activeTab.builder(context) : const Center(child: Text('Tidak ada akses')),
          ),
        ],
      ),

      // Modern Mobile Bottom Navigation Bar (Docked at the bottom)
      bottomNavigationBar: !isDesktop && primaryTabs.isNotEmpty
          ? Container(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                boxShadow: [
                  BoxShadow(
                    color: Color(0x14000000),
                    blurRadius: 16,
                    offset: Offset(0, -4),
                  ),
                ],
                borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
              ),
              child: ClipRRect(
                borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
                child: NavigationBar(
                  selectedIndex: _selectedIndex,
                  onDestinationSelected: (idx) => _switchTab(idx),
                  destinations: primaryTabs.map((item) {
                    // Badge on POS if cart has items
                    if (item.label == 'Kasir' && posProvider.totalItemCount > 0) {
                      return NavigationDestination(
                        icon: Badge(
                          label: Text('${posProvider.totalItemCount}'),
                          backgroundColor: AppColors.error,
                          child: Icon(item.icon),
                        ),
                        selectedIcon: Badge(
                          label: Text('${posProvider.totalItemCount}'),
                          backgroundColor: AppColors.error,
                          child: Icon(item.icon, color: AppColors.primary),
                        ),
                        label: item.label,
                      );
                    }
                    return NavigationDestination(
                      icon: Icon(item.icon),
                      selectedIcon: Icon(item.icon, color: AppColors.primary),
                      label: item.label,
                    );
                  }).toList(),
                ),
              ),
            )
          : null,
    );
  }

  // 5 Modern Top-Level Modules for Mobile Bottom Navigation
  List<_NavItem> _buildPrimaryTabs(AuthProvider auth) {
    final list = <_NavItem>[];

    // 1. Dashboard / Beranda
    list.add(_NavItem(
      icon: Icons.dashboard_rounded,
      label: 'Beranda',
      builder: (_) => _buildDashboardHome(),
    ));

    // 2. POS / Kasir (sales.create or sales.view)
    if (auth.hasPermission('sales.create') || auth.hasPermission('sales.view')) {
      list.add(_NavItem(
        icon: Icons.point_of_sale_rounded,
        label: 'Kasir',
        builder: (_) => const PosScreen(),
      ));
    }

    // 3. Produk & Master
    if (auth.hasPermission('product.view')) {
      list.add(_NavItem(
        icon: Icons.inventory_2_rounded,
        label: 'Produk',
        builder: (_) => const ProductListScreen(),
      ));
    }

    // 4. Stok & Bahan
    if (auth.hasPermission('inventory.view')) {
      list.add(_NavItem(
        icon: Icons.warehouse_rounded,
        label: 'Stok',
        builder: (_) => const InventoryScreen(),
      ));
    }

    // 5. Menu Lainnya & Pengaturan
    list.add(_NavItem(
      icon: Icons.grid_view_rounded,
      label: 'Lainnya',
      builder: (_) => _buildMoreHubMenu(),
    ));

    return list;
  }

  // Dashboard Overview Content
  Widget _buildDashboardHome() {
    final auth = context.watch<AuthProvider>();
    final userName = auth.user?['name'] ?? 'User';

    return Consumer<ReportProvider>(
      builder: (context, rep, _) {
        final data = rep.dashboardData;
        final salesToday = data?['sales_today'] ?? 0;
        final txToday = data?['transactions_today'] ?? 0;
        final expensesToday = data?['expenses_today'] ?? 0;
        final netIncome = data?['net_income_today'] ?? (salesToday - expensesToday);

        return RefreshIndicator(
          onRefresh: () => rep.fetchDashboard(),
          color: AppColors.primary,
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Modern Welcome Hero Card with Blue Gradient
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: AppColors.primaryGradient,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: const [
                      BoxShadow(
                        color: Color(0x330066FF),
                        blurRadius: 16,
                        offset: Offset(0, 6),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: Colors.white.withValues(alpha: 0.2),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.waving_hand_rounded, color: Colors.white, size: 18),
                              ),
                              const SizedBox(width: 10),
                              Text(
                                'Halo, $userName!',
                                style: const TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.cloud_done_rounded, color: Colors.white, size: 14),
                                SizedBox(width: 4),
                                Text(
                                  'Live Cloud',
                                  style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      const Text(
                        'Total Penjualan Hari Ini',
                        style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        CurrencyFormatter.format(salesToday),
                        style: const TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w900,
                          color: Colors.white,
                          letterSpacing: -0.5,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // 4 Realtime KPI Metric Grid
                Row(
                  children: [
                    Expanded(
                      child: _buildMetricTile(
                        'Transaksi',
                        '$txToday Pesanan',
                        Icons.receipt_long_rounded,
                        AppColors.primary,
                        AppColors.primaryContainer,
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildMetricTile(
                        'Pengeluaran',
                        CurrencyFormatter.format(expensesToday),
                        Icons.money_off_rounded,
                        AppColors.error,
                        AppColors.errorContainer,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildMetricTile(
                        'Laba Bersih Hari Ini',
                        CurrencyFormatter.format(netIncome),
                        Icons.account_balance_wallet_rounded,
                        AppColors.accentMint,
                        AppColors.accentMintContainer,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Quick Action Buttons
                const Text(
                  'Aksi Cepat',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: AppColors.textPrimary,
                    letterSpacing: -0.3,
                  ),
                ),
                const SizedBox(height: 12),

                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  crossAxisSpacing: 12,
                  mainAxisSpacing: 12,
                  childAspectRatio: 2.2,
                  children: [
                    _buildModernQuickAction(
                      icon: Icons.point_of_sale_rounded,
                      label: 'Buka Kasir',
                      subtitle: 'Transaksi Baru',
                      color: AppColors.primary,
                      onTap: () => _switchTab(1),
                    ),
                    _buildModernQuickAction(
                      icon: Icons.add_box_rounded,
                      label: 'Tambah Produk',
                      subtitle: 'Katalog Menu',
                      color: AppColors.secondary,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const ProductListScreen()),
                        );
                      },
                    ),
                    _buildModernQuickAction(
                      icon: Icons.add_shopping_cart_rounded,
                      label: 'Stok Masuk',
                      subtitle: 'Restock Bahan',
                      color: AppColors.warning,
                      onTap: () => _switchTab(3),
                    ),
                    _buildModernQuickAction(
                      icon: Icons.money_off_rounded,
                      label: 'Catat Biaya',
                      subtitle: 'Pengeluaran',
                      color: AppColors.error,
                      onTap: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(builder: (_) => const ExpenseScreen()),
                        );
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Reports Shortcut Banner
                InkWell(
                  onTap: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ReportScreen()),
                    );
                  },
                  borderRadius: BorderRadius.circular(16),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.primaryContainer,
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.analytics_rounded, color: AppColors.primary, size: 24),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Laporan Lengkap & Analisis Bisnis',
                                style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Lihat grafik penjualan, laba rugi, dan produk terlaris',
                                style: TextStyle(fontSize: 12, color: AppColors.textSecondary),
                              ),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: AppColors.textTertiary),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 30),
              ],
            ),
          ),
        );
      },
    );
  }

  // Modern 5th Tab: Hub Menu for All Features & Settings
  Widget _buildMoreHubMenu() {
    final auth = context.watch<AuthProvider>();
    final isOwner = auth.isOwner;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Menu & Fitur Lengkap',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: AppColors.textPrimary,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 16),

          // Group 1: Keuangan & Laporan
          _buildMenuSectionTitle('KEUANGAN & LAPORAN'),
          _buildHubTile(
            icon: Icons.bar_chart_rounded,
            title: 'Laporan Penjualan & Laba',
            subtitle: 'Grafik omset, ringkasan per outlet & produk',
            color: AppColors.primary,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ReportScreen()),
              );
            },
          ),
          _buildHubTile(
            icon: Icons.receipt_long_rounded,
            title: 'Riwayat Transaksi',
            subtitle: 'Daftar semua pesanan & pembatalan nota',
            color: AppColors.secondary,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const TransactionHistoryScreen()),
              );
            },
          ),
          _buildHubTile(
            icon: Icons.money_off_rounded,
            title: 'Pencatatan Biaya (Expenses)',
            subtitle: 'Catat biaya operasional & belanja bahan',
            color: AppColors.error,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ExpenseScreen()),
              );
            },
          ),
          const SizedBox(height: 16),

          // Group 2: Katalog & Menu
          _buildMenuSectionTitle('KATALOG & VARIAN'),
          _buildHubTile(
            icon: Icons.category_rounded,
            title: 'Kategori Produk',
            subtitle: 'Kelola kategori minuman, makanan, & retail',
            color: Colors.indigo,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const CategoryManagementScreen()),
              );
            },
          ),
          _buildHubTile(
            icon: Icons.tune_rounded,
            title: 'Topping & Modifier',
            subtitle: 'Atur varian rasa, topping, & level manis',
            color: Colors.purple,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const ModifierManagementScreen()),
              );
            },
          ),
          const SizedBox(height: 16),

          // Group 3: Pengaturan Bisnis & Akun
          _buildMenuSectionTitle('BISNIS & SISTEM'),
          _buildHubTile(
            icon: Icons.storefront_rounded,
            title: 'Manajemen Cabang / Outlet',
            subtitle: 'Tambah cabang, alamat, & staf outlet',
            color: AppColors.accentMint,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const OutletListScreen()),
              );
            },
          ),
          if (isOwner) ...[
            _buildHubTile(
              icon: Icons.badge_rounded,
              title: 'Manajemen Kasir & Tim Staf',
              subtitle: 'Tambah kasir baru per outlet, atur PIN & hak akses',
              color: AppColors.primary,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const BusinessSettingsScreen()),
                );
              },
            ),
            _buildHubTile(
              icon: Icons.stars_rounded,
              title: 'Paket & Langganan SaaS',
              subtitle: 'Status Uji Coba Gratis 1 Bulan, Perpanjangan Langganan',
              color: AppColors.warning,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SubscriptionScreen()),
                );
              },
            ),
            _buildHubTile(
              icon: Icons.admin_panel_settings_rounded,
              title: 'Pengaturan Bisnis & Profil',
              subtitle: 'Kelola nama usaha, entitas hukum, & RBAC',
              color: Colors.indigo,
              onTap: () {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const BusinessSettingsScreen()),
                );
              },
            ),
          ],
          _buildHubTile(
            icon: Icons.swap_horiz_rounded,
            title: 'Ganti Toko / Bisnis',
            subtitle: 'Pindah ke bisnis lain yang Anda miliki',
            color: Colors.blueGrey,
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(builder: (_) => const BusinessSelectorScreen()),
              );
            },
          ),
          const SizedBox(height: 30),
        ],
      ),
    );
  }

  Widget _buildMenuSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(left: 4, bottom: 8),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 11,
          fontWeight: FontWeight.w800,
          color: AppColors.textTertiary,
          letterSpacing: 0.8,
        ),
      ),
    );
  }

  Widget _buildHubTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: ListTile(
        onTap: onTap,
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: color.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: color, size: 22),
        ),
        title: Text(
          title,
          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
        ),
        subtitle: Text(
          subtitle,
          style: const TextStyle(fontSize: 12, color: AppColors.textSecondary),
        ),
        trailing: const Icon(Icons.chevron_right_rounded, size: 20, color: AppColors.textTertiary),
      ),
    );
  }

  Widget _buildMetricTile(
    String title,
    String value,
    IconData icon,
    Color color,
    Color containerColor,
  ) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.cardBorder),
        boxShadow: const [
          BoxShadow(
            color: Color(0x08000000),
            blurRadius: 10,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(7),
                decoration: BoxDecoration(
                  color: containerColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Icon(icon, size: 16, color: color),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  title,
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary,
                    fontWeight: FontWeight.w600,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w800,
              color: color,
              letterSpacing: -0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModernQuickAction({
    required IconData icon,
    required String label,
    required String subtitle,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(14),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: AppColors.surface,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: AppColors.cardBorder),
        ),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: color.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    label,
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    subtitle,
                    style: const TextStyle(fontSize: 11, color: AppColors.textSecondary),
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _NavItem {
  final IconData icon;
  final String label;
  final Widget Function(BuildContext) builder;

  _NavItem({
    required this.icon,
    required this.label,
    required this.builder,
  });
}

