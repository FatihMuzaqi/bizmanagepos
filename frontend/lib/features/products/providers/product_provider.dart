import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class ProductProvider extends ChangeNotifier {
  bool _isLoading = false;
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _products = [];
  List<Map<String, dynamic>> _modifiers = [];
  Map<String, dynamic>? _selectedProduct;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  List<Map<String, dynamic>> get categories => _categories;
  List<Map<String, dynamic>> get products => _products;
  List<Map<String, dynamic>> get modifiers => _modifiers;
  Map<String, dynamic>? get selectedProduct => _selectedProduct;
  String? get errorMessage => _errorMessage;

  /// Fetch all categories
  Future<void> fetchCategories() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.categories);
      if (res is List) {
        _categories = res.cast<Map<String, dynamic>>();
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Create Category
  Future<void> createCategory(String name, [String? description]) async {
    await ApiClient.post(ApiEndpoints.categories, body: {
      'name': name,
      if (description != null) 'description': description,
    });
    await fetchCategories();
  }

  /// Update Category
  Future<void> updateCategory(int id, String name, [String? description]) async {
    await ApiClient.put('${ApiEndpoints.categories}/$id', body: {
      'name': name,
      if (description != null) 'description': description,
    });
    await fetchCategories();
  }

  /// Delete Category
  Future<void> deleteCategory(int id) async {
    await ApiClient.delete('${ApiEndpoints.categories}/$id');
    await fetchCategories();
  }

  /// Fetch all products
  Future<void> fetchProducts({int? categoryId, String? search}) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(
        ApiEndpoints.products,
        queryParams: {
          if (categoryId != null) 'category_id': categoryId,
          if (search != null && search.isNotEmpty) 'search': search,
        },
      );
      if (res is List) {
        _products = res.cast<Map<String, dynamic>>();
      } else {
        _products = [];
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch Product Detail with full graph
  Future<Map<String, dynamic>?> fetchProductDetail(int productId) async {
    try {
      final res = await ApiClient.get('${ApiEndpoints.products}/$productId');
      _selectedProduct = res as Map<String, dynamic>?;
      notifyListeners();
      return _selectedProduct;
    } catch (_) {
      return null;
    }
  }

  /// Create Product
  Future<Map<String, dynamic>> createProduct(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await ApiClient.post(ApiEndpoints.products, body: data);
      await fetchProducts();
      return res as Map<String, dynamic>;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update Product
  Future<void> updateProduct(int productId, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiClient.put('${ApiEndpoints.products}/$productId', body: data);
      await fetchProducts();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Delete Product
  Future<void> deleteProduct(int productId) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiClient.delete('${ApiEndpoints.products}/$productId');
      await fetchProducts();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  // --- Variants ---
  Future<void> createVariant(int productId, Map<String, dynamic> data) async {
    await ApiClient.post('${ApiEndpoints.products}/$productId/variants', body: data);
    await fetchProductDetail(productId);
  }

  Future<void> updateVariant(int productId, int variantId, Map<String, dynamic> data) async {
    await ApiClient.put('${ApiEndpoints.products}/$productId/variants/$variantId', body: data);
    await fetchProductDetail(productId);
  }

  Future<void> deleteVariant(int productId, int variantId) async {
    await ApiClient.delete('${ApiEndpoints.products}/$productId/variants/$variantId');
    await fetchProductDetail(productId);
  }

  // --- Modifiers ---
  Future<void> fetchModifiers() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.modifiers);
      if (res is List) {
        _modifiers = res.cast<Map<String, dynamic>>();
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> createModifier(Map<String, dynamic> data) async {
    await ApiClient.post(ApiEndpoints.modifiers, body: data);
    await fetchModifiers();
  }

  Future<void> updateModifier(int modifierId, Map<String, dynamic> data) async {
    await ApiClient.put('${ApiEndpoints.modifiers}/$modifierId', body: data);
    await fetchModifiers();
  }

  Future<void> deleteModifier(int modifierId) async {
    await ApiClient.delete('${ApiEndpoints.modifiers}/$modifierId');
    await fetchModifiers();
  }

  Future<void> attachModifier(int productId, int modifierId) async {
    await ApiClient.post('${ApiEndpoints.products}/$productId/modifiers', body: {
      'modifier_id': modifierId,
    });
    await fetchProductDetail(productId);
  }

  Future<void> detachModifier(int productId, int modifierId) async {
    await ApiClient.delete('${ApiEndpoints.products}/$productId/modifiers/$modifierId');
    await fetchProductDetail(productId);
  }
}
