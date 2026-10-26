import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/storage/storage_service.dart';

class CartItem {
  final String id;
  final int productId;
  final String productName;
  final int? variantId;
  final String? variantName;
  final double unitPrice;
  int quantity;
  final List<Map<String, dynamic>> selectedModifiers; // List of option items
  String? note;

  CartItem({
    required this.id,
    required this.productId,
    required this.productName,
    this.variantId,
    this.variantName,
    required this.unitPrice,
    this.quantity = 1,
    this.selectedModifiers = const [],
    this.note,
  });

  double get modifiersTotal {
    double total = 0;
    for (var m in selectedModifiers) {
      final p = m['price_adjustment'] ?? m['price'];
      if (p != null) {
        total += (p is num ? p.toDouble() : (double.tryParse(p.toString()) ?? 0.0));
      }
    }
    return total;
  }

  double get singleItemPrice => unitPrice + modifiersTotal;
  double get subtotal => singleItemPrice * quantity;
}

class PosProvider extends ChangeNotifier {
  bool _isLoading = false;
  final List<CartItem> _cart = [];
  Map<String, dynamic>? _lastTransaction;
  List<Map<String, dynamic>> _transactionHistory = [];
  String? _errorMessage;

  bool get isLoading => _isLoading;
  List<CartItem> get cart => _cart;
  Map<String, dynamic>? get lastTransaction => _lastTransaction;
  List<Map<String, dynamic>> get transactionHistory => _transactionHistory;
  String? get errorMessage => _errorMessage;

  double get cartSubtotal {
    double total = 0;
    for (var item in _cart) {
      total += item.subtotal;
    }
    return total;
  }

  int get totalItemCount {
    int count = 0;
    for (var item in _cart) {
      count += item.quantity;
    }
    return count;
  }

  /// Add product with variant and modifiers to POS cart
  void addToCart({
    required int productId,
    required String productName,
    int? variantId,
    String? variantName,
    required double unitPrice,
    int quantity = 1,
    List<Map<String, dynamic>> selectedModifiers = const [],
    String? note,
  }) {
    // Generate unique signature for matching identical customized items
    final modIds = selectedModifiers.map((m) => m['id']).toList()..sort();
    final itemKey = '${productId}_${variantId ?? 0}_${modIds.join('-')}_$note';

    final existingIndex = _cart.indexWhere((item) => item.id == itemKey);
    if (existingIndex >= 0) {
      _cart[existingIndex].quantity += quantity;
    } else {
      _cart.add(
        CartItem(
          id: itemKey,
          productId: productId,
          productName: productName,
          variantId: variantId,
          variantName: variantName,
          unitPrice: unitPrice,
          quantity: quantity,
          selectedModifiers: selectedModifiers,
          note: note,
        ),
      );
    }
    notifyListeners();
  }

  void updateQuantity(int index, int newQuantity) {
    if (index >= 0 && index < _cart.length) {
      if (newQuantity <= 0) {
        _cart.removeAt(index);
      } else {
        _cart[index].quantity = newQuantity;
      }
      notifyListeners();
    }
  }

  void removeFromCart(int index) {
    if (index >= 0 && index < _cart.length) {
      _cart.removeAt(index);
      notifyListeners();
    }
  }

  void clearCart() {
    _cart.clear();
    notifyListeners();
  }

  /// Process Checkout & Payment via Backend API
  Future<Map<String, dynamic>> checkout({
    required String paymentMethod,
    required double amountPaid,
    String? transactionNote,
    double discount = 0,
    double tax = 0,
  }) async {
    final outletId = StorageService.getActiveOutletId();
    if (outletId == null) {
      throw ApiException(
        statusCode: 400,
        message: 'No active outlet selected',
      );
    }

    if (_cart.isEmpty) {
      throw ApiException(
        statusCode: 400,
        message: 'Cart is empty',
      );
    }

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final itemsPayload = _cart.map((item) {
        final modifiersPayload = item.selectedModifiers.map((mod) {
          return {
            'modifier_id': mod['modifier_id'],
            'modifier_option_id': mod['id'],
            'option_id': mod['id'],
          };
        }).toList();

        return {
          'product_id': item.productId,
          if (item.variantId != null) 'variant_id': item.variantId,
          'quantity': item.quantity,
          if (modifiersPayload.isNotEmpty) 'modifiers': modifiersPayload,
          if (item.note != null && item.note!.isNotEmpty) 'note': item.note,
        };
      }).toList();

      final payload = {
        'outlet_id': outletId,
        'items': itemsPayload,
        'discount': discount,
        'tax': tax,
        'payment': {
          'method': paymentMethod == 'DEBIT' ? 'OTHER' : paymentMethod,
          'payment_method': paymentMethod == 'DEBIT' ? 'OTHER' : paymentMethod,
          'paid_amount': amountPaid,
          'amount_paid': amountPaid,
        },
        if (transactionNote != null && transactionNote.isNotEmpty)
          'note': transactionNote,
      };

      final res = await ApiClient.post(ApiEndpoints.transactions, body: payload);
      _lastTransaction = res as Map<String, dynamic>?;
      clearCart();
      return _lastTransaction!;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch Transaction History
  Future<void> fetchTransactionHistory({
    int? outletId,
    String? status,
    String? startDate,
    String? endDate,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final targetOutlet = outletId ?? StorageService.getActiveOutletId();

    try {
      final res = await ApiClient.get(
        ApiEndpoints.transactions,
        queryParams: {
          if (targetOutlet != null) 'outlet_id': targetOutlet,
          if (status != null) 'status': status,
          if (startDate != null) 'start_date': startDate,
          if (endDate != null) 'end_date': endDate,
        },
      );
      if (res is List) {
        _transactionHistory = res.cast<Map<String, dynamic>>();
      } else {
        _transactionHistory = [];
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Cancel Transaction & Restore Stock
  Future<void> cancelTransaction(int transactionId, [String? reason]) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiClient.post(
        '${ApiEndpoints.transactions}/$transactionId/cancel',
        body: {
          if (reason != null && reason.isNotEmpty) 'reason': reason,
        },
      );
      await fetchTransactionHistory();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
