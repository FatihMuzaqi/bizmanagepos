import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/storage/storage_service.dart';

class InventoryProvider extends ChangeNotifier {
  bool _isLoading = false;
  List<Map<String, dynamic>> _units = [];
  List<Map<String, dynamic>> _ingredients = [];
  List<Map<String, dynamic>> _stocks = [];
  List<Map<String, dynamic>> _movements = [];
  List<Map<String, dynamic>> _recipes = [];
  String? _errorMessage;

  bool get isLoading => _isLoading;
  List<Map<String, dynamic>> get units => _units;
  List<Map<String, dynamic>> get ingredients => _ingredients;
  List<Map<String, dynamic>> get stocks => _stocks;
  List<Map<String, dynamic>> get movements => _movements;
  List<Map<String, dynamic>> get recipes => _recipes;
  String? get errorMessage => _errorMessage;

  int? get _activeOutletId => StorageService.getActiveOutletId();

  /// Fetch Units
  Future<void> fetchUnits() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.units);
      if (res is List) {
        _units = res.cast<Map<String, dynamic>>();
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Create Unit
  Future<Map<String, dynamic>?> createUnit(String name, String symbol) async {
    final res = await ApiClient.post(ApiEndpoints.units, body: {'name': name, 'symbol': symbol});
    await fetchUnits();
    if (res is Map<String, dynamic>) {
      return res;
    }
    return null;
  }

  /// Fetch Ingredients
  Future<void> fetchIngredients() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiEndpoints.ingredients);
      if (res is List) {
        _ingredients = res.cast<Map<String, dynamic>>();
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Create Ingredient
  Future<void> createIngredient(Map<String, dynamic> data) async {
    await ApiClient.post(ApiEndpoints.ingredients, body: data);
    await fetchIngredients();
  }

  /// Update Ingredient
  Future<void> updateIngredient(int id, Map<String, dynamic> data) async {
    await ApiClient.put('${ApiEndpoints.ingredients}/$id', body: data);
    await fetchIngredients();
  }

  /// Delete Ingredient
  Future<void> deleteIngredient(int id) async {
    await ApiClient.delete('${ApiEndpoints.ingredients}/$id');
    await fetchIngredients();
  }

  /// Fetch Stock for current outlet
  Future<void> fetchStocks([int? outletId]) async {
    final targetOutlet = outletId ?? _activeOutletId;
    if (targetOutlet == null) return;

    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(
        ApiEndpoints.stock,
        queryParams: {'outlet_id': targetOutlet},
      );
      if (res is List) {
        _stocks = res.cast<Map<String, dynamic>>();
      } else if (res is Map && res['items'] is List) {
        _stocks = (res['items'] as List).cast<Map<String, dynamic>>();
      } else if (res is Map && res['stocks'] is List) {
        _stocks = (res['stocks'] as List).cast<Map<String, dynamic>>();
      } else if (res is Map && res['data'] is List) {
        _stocks = (res['data'] as List).cast<Map<String, dynamic>>();
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch Stock Movements for current outlet
  Future<void> fetchMovements([int? outletId]) async {
    final targetOutlet = outletId ?? _activeOutletId;
    if (targetOutlet == null) return;

    try {
      final res = await ApiClient.get(
        ApiEndpoints.stockMovements,
        queryParams: {'outlet_id': targetOutlet},
      );
      if (res is List) {
        _movements = res.cast<Map<String, dynamic>>();
        notifyListeners();
      } else if (res is Map && res['movements'] is List) {
        _movements = (res['movements'] as List).cast<Map<String, dynamic>>();
        notifyListeners();
      } else if (res is Map && res['data'] is List) {
        _movements = (res['data'] as List).cast<Map<String, dynamic>>();
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Stock In
  Future<void> stockIn({
    required int ingredientId,
    required double quantity,
    double? costPerUnit,
    String? notes,
    int? outletId,
  }) async {
    final targetOutlet = outletId ?? _activeOutletId;
    await ApiClient.post(ApiEndpoints.stockIn, body: {
      'outlet_id': targetOutlet,
      'ingredient_id': ingredientId,
      'quantity': quantity,
      if (costPerUnit != null) 'cost_per_unit': costPerUnit,
      if (notes != null) 'notes': notes,
    });
    await fetchStocks(targetOutlet);
  }

  /// Stock Out
  Future<void> stockOut({
    required int ingredientId,
    required double quantity,
    String? notes,
    int? outletId,
  }) async {
    final targetOutlet = outletId ?? _activeOutletId;
    await ApiClient.post(ApiEndpoints.stockOut, body: {
      'outlet_id': targetOutlet,
      'ingredient_id': ingredientId,
      'quantity': quantity,
      if (notes != null) 'notes': notes,
    });
    await fetchStocks(targetOutlet);
  }

  /// Stock Adjustment
  Future<void> stockAdjustment({
    required int ingredientId,
    required double actualQuantity,
    String? notes,
    int? outletId,
  }) async {
    final targetOutlet = outletId ?? _activeOutletId;
    await ApiClient.post(ApiEndpoints.stockAdjustment, body: {
      'outlet_id': targetOutlet,
      'ingredient_id': ingredientId,
      'actual_quantity': actualQuantity,
      if (notes != null) 'notes': notes,
    });
    await fetchStocks(targetOutlet);
  }

  /// Fetch Recipes
  Future<void> fetchRecipes() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.recipes);
      if (res is List) {
        _recipes = res.cast<Map<String, dynamic>>();
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Create Recipe
  Future<void> createRecipe(Map<String, dynamic> data) async {
    await ApiClient.post(ApiEndpoints.recipes, body: data);
    await fetchRecipes();
  }

  /// Delete Recipe
  Future<void> deleteRecipe(int id) async {
    await ApiClient.delete('${ApiEndpoints.recipes}/$id');
    await fetchRecipes();
  }
}
