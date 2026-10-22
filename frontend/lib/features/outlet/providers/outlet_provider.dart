import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/storage/storage_service.dart';

class OutletProvider extends ChangeNotifier {
  bool _isLoading = false;
  List<Map<String, dynamic>> _outlets = [];
  String? _errorMessage;

  bool get isLoading => _isLoading;
  List<Map<String, dynamic>> get outlets => _outlets;
  String? get errorMessage => _errorMessage;

  int? get activeOutletId => StorageService.getActiveOutletId();
  String? get activeOutletName => StorageService.getActiveOutletName();

  void setOutlets(List<Map<String, dynamic>> list) {
    _outlets = list;
    notifyListeners();
  }

  /// Select active outlet context
  Future<void> selectOutlet(int outletId, String outletName) async {
    await StorageService.setActiveOutletId(outletId);
    await StorageService.setActiveOutletName(outletName);
    notifyListeners();
  }

  /// Fetch all outlets of current business
  Future<void> fetchOutlets() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiEndpoints.outlets);
      if (res is List) {
        _outlets = res.cast<Map<String, dynamic>>();
      } else {
        _outlets = [];
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Create a new outlet branch
  Future<Map<String, dynamic>> createOutlet(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await ApiClient.post(ApiEndpoints.outlets, body: data);
      await fetchOutlets();
      return res as Map<String, dynamic>;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Update outlet info
  Future<void> updateOutlet(int outletId, Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiClient.put('${ApiEndpoints.outlets}/$outletId', body: data);
      if (activeOutletId == outletId && data['name'] != null) {
        await StorageService.setActiveOutletName(data['name']);
      }
      await fetchOutlets();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Deactivate / delete outlet
  Future<void> deleteOutlet(int outletId) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiClient.delete('${ApiEndpoints.outlets}/$outletId');
      await fetchOutlets();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
