import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/api/api_client.dart';
import '../../../core/api/api_endpoints.dart';
import '../../../core/auth/auth_provider.dart';
import '../../../core/storage/storage_service.dart';
import '../../dashboard/screens/dashboard_screen.dart';
import '../../outlet/providers/outlet_provider.dart';
import '../../outlet/screens/outlet_selector_screen.dart';

class BusinessProvider extends ChangeNotifier {
  bool _isLoading = false;
  List<Map<String, dynamic>> _myBusinesses = [];
  Map<String, dynamic>? _currentBusiness;
  List<Map<String, dynamic>> _members = [];
  List<Map<String, dynamic>> _roles = [];
  String? _errorMessage;

  bool get isLoading => _isLoading;
  List<Map<String, dynamic>> get myBusinesses => _myBusinesses;
  Map<String, dynamic>? get currentBusiness => _currentBusiness;
  List<Map<String, dynamic>> get members => _members;
  List<Map<String, dynamic>> get roles => _roles;
  String? get errorMessage => _errorMessage;

  int? get activeBusinessId => StorageService.getActiveBusinessId();
  String? get activeBusinessName => StorageService.getActiveBusinessName();

  /// Fetch all businesses where user is owner or staff
  Future<void> fetchMyBusinesses() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.get(ApiEndpoints.myBusinesses);
      if (res is List) {
        _myBusinesses = res.cast<Map<String, dynamic>>();
      } else {
        _myBusinesses = [];
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Select business context and route appropriately
  Future<void> selectBusiness(
    BuildContext context,
    int businessId, {
    int? preselectedOutletId,
  }) async {
    _isLoading = true;
    notifyListeners();

    try {
      final res = await ApiClient.post(
        ApiEndpoints.selectBusiness,
        body: {'business_id': businessId},
      );

      final business = res['business'];
      final rawPerms = res['permissions'] as List? ?? [];
      final permissions = rawPerms.map((p) => p.toString()).toList();
      final isOwner = res['is_owner'] == true;
      final outlets = (res['outlets'] as List? ?? []).cast<Map<String, dynamic>>();

      await StorageService.setActiveBusinessId(businessId);
      if (business != null && business['name'] != null) {
        await StorageService.setActiveBusinessName(business['name']);
      }

      if (context.mounted) {
        // Update permissions in AuthProvider
        context.read<AuthProvider>().updatePermissions(
              permissions: permissions,
              isOwner: isOwner,
            );

        // Update outlets in OutletProvider
        final outletProvider = context.read<OutletProvider>();
        outletProvider.setOutlets(outlets);

        // Routing logic based on outlet count
        if (preselectedOutletId != null) {
          final matched = outlets.firstWhere(
            (o) => o['id'] == preselectedOutletId,
            orElse: () => outlets.isNotEmpty ? outlets.first : {'id': preselectedOutletId, 'name': 'Primary Outlet'},
          );
          await outletProvider.selectOutlet(matched['id'] as int, matched['name'] as String);
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
            (route) => false,
          );
        } else if (outlets.length == 1) {
          final singleOutlet = outlets.first;
          await outletProvider.selectOutlet(
            singleOutlet['id'] as int,
            singleOutlet['name'] as String,
          );
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
            (route) => false,
          );
        } else if (outlets.length > 1) {
          Navigator.of(context).pushReplacement(
            MaterialPageRoute(builder: (_) => const OutletSelectorScreen()),
          );
        } else {
          // No outlets assigned yet or owner creating first
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (_) => const DashboardScreen()),
            (route) => false,
          );
        }
      }
    } on ApiException catch (e) {
      _errorMessage = e.message;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch active business profile & statistics
  Future<void> fetchCurrentBusiness() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.currentBusiness);
      _currentBusiness = res as Map<String, dynamic>?;
      notifyListeners();
    } catch (_) {}
  }

  /// Update active business profile
  Future<void> updateBusinessProfile(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await ApiClient.put(ApiEndpoints.currentBusiness, body: data);
      _currentBusiness = res as Map<String, dynamic>?;
      if (_currentBusiness != null && _currentBusiness!['name'] != null) {
        await StorageService.setActiveBusinessName(_currentBusiness!['name']);
      }
      notifyListeners();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Create a new additional business
  Future<Map<String, dynamic>> createBusiness(Map<String, dynamic> data) async {
    _isLoading = true;
    notifyListeners();
    try {
      final res = await ApiClient.post(ApiEndpoints.createBusiness, body: data);
      await fetchMyBusinesses();
      return res as Map<String, dynamic>;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch members of active business
  Future<void> fetchMembers() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.businessMembers);
      if (res is List) {
        _members = res.cast<Map<String, dynamic>>();
      }
      notifyListeners();
    } catch (_) {}
  }

  /// Fetch roles of active business
  Future<void> fetchRoles() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.roles);
      if (res is List) {
        _roles = res.cast<Map<String, dynamic>>();
      }
      notifyListeners();
    } catch (_) {}
  }

  /// Add member to active business
  Future<void> addMember(Map<String, dynamic> data) async {
    await ApiClient.post(ApiEndpoints.businessMembers, body: data);
    await fetchMembers();
  }

  /// Update member role
  Future<void> updateMemberRole(int userId, int roleId) async {
    await ApiClient.put(
      '${ApiEndpoints.businessMembers}/$userId',
      body: {'role_id': roleId},
    );
    await fetchMembers();
  }

  /// Remove member
  Future<void> removeMember(int userId) async {
    await ApiClient.delete('${ApiEndpoints.businessMembers}/$userId');
    await fetchMembers();
  }
}
