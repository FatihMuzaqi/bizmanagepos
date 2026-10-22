import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/storage/storage_service.dart';

class ExpenseProvider extends ChangeNotifier {
  bool _isLoading = false;
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _expenses = [];
  String? _errorMessage;

  bool get isLoading => _isLoading;
  List<Map<String, dynamic>> get categories => _categories;
  List<Map<String, dynamic>> get expenses => _expenses;
  String? get errorMessage => _errorMessage;

  int? get _activeOutletId => StorageService.getActiveOutletId();

  /// Fetch Expense Categories
  Future<void> fetchCategories() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.expenseCategories);
      if (res is List) {
        _categories = res.cast<Map<String, dynamic>>();
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Create Category
  Future<void> createCategory(String name, [String? description]) async {
    await ApiClient.post(ApiEndpoints.expenseCategories, body: {
      'name': name,
      if (description != null) 'description': description,
    });
    await fetchCategories();
  }

  /// Update Category
  Future<void> updateCategory(int id, String name, [String? description]) async {
    await ApiClient.put('${ApiEndpoints.expenseCategories}/$id', body: {
      'name': name,
      if (description != null) 'description': description,
    });
    await fetchCategories();
  }

  /// Delete Category
  Future<void> deleteCategory(int id) async {
    await ApiClient.delete('${ApiEndpoints.expenseCategories}/$id');
    await fetchCategories();
  }

  /// Fetch Expenses for current outlet or all
  Future<void> fetchExpenses({
    int? outletId,
    int? categoryId,
    String? status,
    String? startDate,
    String? endDate,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(
        ApiEndpoints.expenses,
        queryParams: {
          if (outletId != null) 'outlet_id': outletId,
          if (categoryId != null) 'category_id': categoryId,
          if (status != null) 'status': status,
          if (startDate != null) 'start_date': startDate,
          if (endDate != null) 'end_date': endDate,
        },
      );
      if (res is List) {
        _expenses = res.cast<Map<String, dynamic>>();
      } else {
        _expenses = [];
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Record New Expense
  Future<void> recordExpense({
    int? outletId,
    required int categoryId,
    required double amount,
    required String expenseDate,
    String? description,
  }) async {
    final targetOutlet = outletId ?? _activeOutletId;
    _isLoading = true;
    notifyListeners();
    try {
      await ApiClient.post(ApiEndpoints.expenses, body: {
        'outlet_id': targetOutlet,
        'category_id': categoryId,
        'amount': amount,
        'expense_date': expenseDate,
        if (description != null) 'description': description,
      });
      await fetchExpenses(outletId: targetOutlet);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Cancel Expense
  Future<void> cancelExpense(int expenseId) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiClient.post('${ApiEndpoints.expenses}/$expenseId/cancel');
      await fetchExpenses();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
