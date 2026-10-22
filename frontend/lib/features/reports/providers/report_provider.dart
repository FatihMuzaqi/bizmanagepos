import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/storage/storage_service.dart';

class ReportProvider extends ChangeNotifier {
  bool _isLoading = false;
  Map<String, dynamic>? _dashboardData;
  Map<String, dynamic>? _salesReport;
  List<Map<String, dynamic>> _productReport = [];
  List<Map<String, dynamic>> _outletReport = [];
  Map<String, dynamic>? _expenseReport;
  String? _errorMessage;

  String _selectedPreset = 'today';
  int? _selectedOutletId;

  bool get isLoading => _isLoading;
  Map<String, dynamic>? get dashboardData => _dashboardData;
  Map<String, dynamic>? get salesReport => _salesReport;
  List<Map<String, dynamic>> get productReport => _productReport;
  List<Map<String, dynamic>> get outletReport => _outletReport;
  Map<String, dynamic>? get expenseReport => _expenseReport;
  String? get errorMessage => _errorMessage;
  String get selectedPreset => _selectedPreset;
  int? get selectedOutletId => _selectedOutletId ?? StorageService.getActiveOutletId();

  void setFilterPreset(String preset) {
    _selectedPreset = preset;
    notifyListeners();
  }

  void setSelectedOutlet(int? outletId) {
    _selectedOutletId = outletId;
    notifyListeners();
  }

  /// Fetch Dashboard Summary
  Future<void> fetchDashboard([String? preset, int? outletId]) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final targetPreset = preset ?? _selectedPreset;
    final targetOutlet = outletId ?? _selectedOutletId ?? StorageService.getActiveOutletId();

    try {
      final res = await ApiClient.get(
        ApiEndpoints.dashboardReport,
        queryParams: {
          'date_preset': targetPreset,
          if (targetOutlet != null) 'outlet_id': targetOutlet,
        },
      );
      _dashboardData = res as Map<String, dynamic>?;
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch Sales Report
  Future<void> fetchSalesReport([String? preset, int? outletId]) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final targetPreset = preset ?? _selectedPreset;
    final targetOutlet = outletId ?? _selectedOutletId ?? StorageService.getActiveOutletId();

    try {
      final res = await ApiClient.get(
        ApiEndpoints.salesReport,
        queryParams: {
          'date_preset': targetPreset,
          if (targetOutlet != null) 'outlet_id': targetOutlet,
        },
      );
      _salesReport = res as Map<String, dynamic>?;
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch Product Sales Performance Report
  Future<void> fetchProductReport([String? preset, int? outletId]) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final targetPreset = preset ?? _selectedPreset;
    final targetOutlet = outletId ?? _selectedOutletId ?? StorageService.getActiveOutletId();

    try {
      final res = await ApiClient.get(
        ApiEndpoints.productReport,
        queryParams: {
          'date_preset': targetPreset,
          if (targetOutlet != null) 'outlet_id': targetOutlet,
        },
      );
      if (res is List) {
        _productReport = res.cast<Map<String, dynamic>>();
      } else {
        _productReport = [];
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch Outlet Comparison Report
  Future<void> fetchOutletReport([String? preset]) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final targetPreset = preset ?? _selectedPreset;

    try {
      final res = await ApiClient.get(
        ApiEndpoints.outletReport,
        queryParams: {'date_preset': targetPreset},
      );
      if (res is List) {
        _outletReport = res.cast<Map<String, dynamic>>();
      } else {
        _outletReport = [];
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch Expenses Breakdown Report
  Future<void> fetchExpenseReport([String? preset, int? outletId]) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    final targetPreset = preset ?? _selectedPreset;
    final targetOutlet = outletId ?? _selectedOutletId ?? StorageService.getActiveOutletId();

    try {
      final res = await ApiClient.get(
        ApiEndpoints.expenseReport,
        queryParams: {
          'date_preset': targetPreset,
          if (targetOutlet != null) 'outlet_id': targetOutlet,
        },
      );
      _expenseReport = res as Map<String, dynamic>?;
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
