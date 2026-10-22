import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/auth/auth_provider.dart';
import 'core/constants/app_config.dart';
import 'core/constants/app_theme.dart';
import 'core/storage/storage_service.dart';
import 'features/authentication/screens/login_screen.dart';
import 'features/business/providers/business_provider.dart';
import 'features/business/screens/business_selector_screen.dart';
import 'features/dashboard/screens/dashboard_screen.dart';
import 'features/expenses/providers/expense_provider.dart';
import 'features/inventory/providers/inventory_provider.dart';
import 'features/outlet/providers/outlet_provider.dart';
import 'features/outlet/screens/outlet_selector_screen.dart';
import 'features/pos/providers/pos_provider.dart';
import 'features/products/providers/product_provider.dart';
import 'features/reports/providers/report_provider.dart';
import 'features/subscription/providers/subscription_provider.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await StorageService.init();

  debugPrint('🚀 [BizManage] Base API URL: ${AppConfig.baseUrl}');

  runApp(const BizManageApp());
}

class BizManageApp extends StatelessWidget {
  const BizManageApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()..initSession()),
        ChangeNotifierProvider(create: (_) => BusinessProvider()),
        ChangeNotifierProvider(create: (_) => OutletProvider()),
        ChangeNotifierProvider(create: (_) => ProductProvider()),
        ChangeNotifierProvider(create: (_) => InventoryProvider()),
        ChangeNotifierProvider(create: (_) => PosProvider()),
        ChangeNotifierProvider(create: (_) => ExpenseProvider()),
        ChangeNotifierProvider(create: (_) => ReportProvider()),
        ChangeNotifierProvider(create: (_) => SubscriptionProvider()),
      ],
      child: MaterialApp(
        title: 'BizManage POS & Business ERP',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const AuthGate(),
      ),
    );
  }
}

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    if (!auth.isInitialized || auth.isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Memuat BizManage...', style: TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      );
    }

    if (!auth.isAuthenticated) {
      return const LoginScreen();
    }

    // Authenticated: Route according to active business / outlet selection
    final activeBizId = StorageService.getActiveBusinessId();
    if (activeBizId == null) {
      return const BusinessSelectorScreen();
    }

    final activeOutletId = StorageService.getActiveOutletId();
    if (activeOutletId == null) {
      return const OutletSelectorScreen();
    }

    return const DashboardScreen();
  }
}
