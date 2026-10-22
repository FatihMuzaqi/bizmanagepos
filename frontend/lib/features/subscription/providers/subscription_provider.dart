import 'package:flutter/material.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';

class SubscriptionProvider extends ChangeNotifier {
  bool _isLoading = false;
  Map<String, dynamic>? _overview;
  List<Map<String, dynamic>> _plans = [];
  List<Map<String, dynamic>> _invoices = [];
  Map<String, dynamic>? _activeCheckout;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  Map<String, dynamic>? get overview => _overview;
  List<Map<String, dynamic>> get plans => _plans;
  List<Map<String, dynamic>> get invoices => _invoices;
  Map<String, dynamic>? get activeCheckout => _activeCheckout;
  String? get errorMessage => _errorMessage;

  Map<String, dynamic>? get subscription => _overview?['subscription'];
  Map<String, dynamic>? get plan => subscription?['plan'];
  Map<String, dynamic>? get usage => _overview?['usage'];
  String get status => subscription?['status'] ?? 'UNKNOWN';
  bool get isTrial => status == 'TRIAL';
  bool get isExpired => status == 'EXPIRED' || status == 'PAST_DUE';

  /// Fetch Available Plans
  Future<void> fetchPlans() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.subscriptionPlans);
      if (res is List) {
        _plans = res.cast<Map<String, dynamic>>();
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Fetch Active Subscription and Usage
  Future<void> fetchSubscriptionOverview() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiEndpoints.subscription);
      _overview = res as Map<String, dynamic>?;
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Create Midtrans Snap Checkout
  Future<Map<String, dynamic>> createCheckout(int planId) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.post(
        ApiEndpoints.subscriptionCheckout,
        body: {'plan_id': planId},
      );
      final checkoutData = res as Map<String, dynamic>;
      _activeCheckout = checkoutData;
      return checkoutData;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Check Payment Status directly with Backend / Midtrans
  Future<Map<String, dynamic>> checkPayment(String orderId) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await ApiClient.get('${ApiEndpoints.subscriptionCheckPayment}/$orderId');
      final result = res as Map<String, dynamic>;

      // If payment is completed/paid, refresh subscription overview and invoices
      if (result['status'] == 'PAID') {
        await fetchSubscriptionOverview();
        await fetchInvoices();
      }

      return result;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch Invoices History
  Future<void> fetchInvoices() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.subscriptionInvoices);
      if (res is List) {
        _invoices = res.cast<Map<String, dynamic>>();
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Direct Upgrade (Fallback or Free Plan)
  Future<void> upgradePlan(int planId) async {
    _isLoading = true;
    notifyListeners();
    try {
      await ApiClient.post(
        ApiEndpoints.upgradeSubscription,
        body: {'plan_id': planId},
      );
      await fetchSubscriptionOverview();
      await fetchInvoices();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
