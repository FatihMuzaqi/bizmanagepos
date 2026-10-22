import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:bizmanage_app/core/auth/auth_provider.dart';
import 'package:bizmanage_app/core/storage/storage_service.dart';
import 'package:bizmanage_app/core/utils/currency_formatter.dart';
import 'package:bizmanage_app/core/utils/date_formatter.dart';
import 'package:bizmanage_app/features/pos/providers/pos_provider.dart';
import 'package:bizmanage_app/main.dart';

void main() {
  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await StorageService.init();
  });

  group('Core Utilities & Storage Tests', () {
    test('CurrencyFormatter formats IDR correctly', () {
      expect(CurrencyFormatter.format(0), 'Rp 0');
      expect(CurrencyFormatter.format(15000), 'Rp 15.000');
      expect(CurrencyFormatter.format(1250500), 'Rp 1.250.500');
      expect(CurrencyFormatter.format('50000'), 'Rp 50.000');
      expect(CurrencyFormatter.format(null), 'Rp 0');
    });

    test('DateFormatter formats dates and times correctly', () {
      final testDate = DateTime(2026, 9, 29, 14, 30);
      expect(DateFormatter.formatDate(testDate), '29 Sep 2026');
      expect(DateFormatter.formatTime(testDate), '14:30');
      expect(DateFormatter.formatDateTime(testDate), '29 Sep 2026, 14:30');
      expect(DateFormatter.formatDate(null), '-');
    });

    test('StorageService persists and retrieves tokens and business context', () async {
      await StorageService.setAccessToken('test_jwt_access_token');
      await StorageService.setRefreshToken('test_jwt_refresh_token');
      await StorageService.setActiveBusinessId(101);
      await StorageService.setActiveBusinessName('Es Teh Mantap');
      await StorageService.setPermissions(['sales.create', 'product.view']);

      expect(StorageService.getAccessToken(), 'test_jwt_access_token');
      expect(StorageService.getRefreshToken(), 'test_jwt_refresh_token');
      expect(StorageService.getActiveBusinessId(), 101);
      expect(StorageService.getActiveBusinessName(), 'Es Teh Mantap');
      expect(StorageService.getPermissions(), ['sales.create', 'product.view']);

      await StorageService.clearAll();
      expect(StorageService.getAccessToken(), null);
      expect(StorageService.getActiveBusinessId(), null);
      expect(StorageService.getPermissions(), isEmpty);
    });
  });

  group('Dynamic RBAC Permission Tests', () {
    test('Owner has universal full access (*)', () {
      final auth = AuthProvider();
      auth.updatePermissions(permissions: [], isOwner: true);

      expect(auth.hasPermission('sales.create'), isTrue);
      expect(auth.hasPermission('product.delete'), isTrue);
      expect(auth.hasPermission('subscription.manage'), isTrue);
      expect(auth.hasPermission('non_existent_perm'), isTrue);
    });

    test('Wildcard * permission grants all access', () {
      final auth = AuthProvider();
      auth.updatePermissions(permissions: ['*'], isOwner: false);

      expect(auth.hasPermission('sales.create'), isTrue);
      expect(auth.hasPermission('product.view'), isTrue);
    });

    test('Cashier role only has assigned permissions', () {
      final auth = AuthProvider();
      auth.updatePermissions(
        permissions: ['sales.create', 'sales.view', 'product.view'],
        isOwner: false,
      );

      expect(auth.hasPermission('sales.create'), isTrue);
      expect(auth.hasPermission('sales.view'), isTrue);
      expect(auth.hasPermission('product.view'), isTrue);

      // Blocked permissions
      expect(auth.hasPermission('product.create'), isFalse);
      expect(auth.hasPermission('product.delete'), isFalse);
      expect(auth.hasPermission('subscription.manage'), isFalse);
      expect(auth.hasPermission('expense.create'), isFalse);
    });
  });

  group('POS Cart & Pricing Calculations', () {
    test('CartItem correctly computes subtotal with modifiers and quantity', () {
      final item = CartItem(
        id: 'item_1',
        productId: 10,
        productName: 'Es Teh Manis',
        variantId: 2,
        variantName: 'Jumbo',
        unitPrice: 8000.0,
        quantity: 3,
        selectedModifiers: [
          {'id': 1, 'modifier_id': 1, 'name': 'Extra Jelly', 'price': 2000.0},
          {'id': 2, 'modifier_id': 2, 'name': 'Lemon Slice', 'price': 1000.0},
        ],
      );

      expect(item.modifiersTotal, 3000.0);
      expect(item.singleItemPrice, 11000.0);
      expect(item.subtotal, 33000.0);
    });

    test('PosProvider accurately aggregates cart subtotal and item count', () {
      final pos = PosProvider();
      expect(pos.cart, isEmpty);
      expect(pos.cartSubtotal, 0.0);
      expect(pos.totalItemCount, 0);

      // Add item 1
      pos.addToCart(
        productId: 1,
        productName: 'Kebab Beef',
        unitPrice: 18000.0,
        quantity: 2,
      );
      expect(pos.totalItemCount, 2);
      expect(pos.cartSubtotal, 36000.0);

      // Add item 2 with modifier
      pos.addToCart(
        productId: 2,
        productName: 'Es Kopi Susu',
        unitPrice: 15000.0,
        quantity: 1,
        selectedModifiers: [
          {'id': 5, 'modifier_id': 2, 'name': 'Gula Aren Extra', 'price': 3000.0}
        ],
      );
      expect(pos.totalItemCount, 3);
      expect(pos.cartSubtotal, 54000.0); // 36000 + (15000 + 3000)

      // Update quantity
      pos.updateQuantity(0, 3);
      expect(pos.totalItemCount, 4);
      expect(pos.cartSubtotal, 72000.0); // (18000 * 3) + 18000

      // Remove item
      pos.removeFromCart(1);
      expect(pos.totalItemCount, 3);
      expect(pos.cartSubtotal, 54000.0);

      // Clear cart
      pos.clearCart();
      expect(pos.cart, isEmpty);
      expect(pos.cartSubtotal, 0.0);
    });
  });

  group('Widget Smoke Tests', () {
    testWidgets('BizManageApp renders initial authentication gate', (WidgetTester tester) async {
      await tester.pumpWidget(const BizManageApp());
      await tester.pump();

      // Verify that login screen or app header is rendered
      expect(find.byType(MaterialApp), findsOneWidget);
    });
  });
}
