import 'package:flutter/material.dart';
import '../api/api_client.dart';
import '../api/api_endpoints.dart';
import '../storage/storage_service.dart';

class AuthProvider extends ChangeNotifier {
  bool _isLoading = false;
  bool _isInitialized = false;
  Map<String, dynamic>? _user;
  List<String> _permissions = [];
  bool _isOwner = false;
  String? _errorMessage;

  bool get isLoading => _isLoading;
  bool get isInitialized => _isInitialized;
  bool get isAuthenticated => StorageService.getAccessToken() != null;
  Map<String, dynamic>? get user => _user;
  List<String> get permissions => _permissions;
  bool get isOwner => _isOwner;
  String? get errorMessage => _errorMessage;

  AuthProvider() {
    ApiClient.onUnauthorized = () {
      logout();
    };
  }

  /// Check dynamic RBAC permission
  bool hasPermission(String permission) {
    if (_isOwner) return true;
    if (_permissions.contains('*')) return true;
    return _permissions.contains(permission);
  }

  /// Initialize session from local storage on app start
  Future<void> initSession() async {
    _isLoading = true;
    notifyListeners();

    try {
      await StorageService.init();
      final token = StorageService.getAccessToken();
      if (token != null) {
        _user = StorageService.getUserData();
        _permissions = StorageService.getPermissions();
        _isOwner = StorageService.getIsOwner();

        // Refresh user profile and permissions from backend in background
        try {
          await fetchUserProfile();
          await fetchMyPermissions();
        } catch (_) {}
      }
    } finally {
      _isLoading = false;
      _isInitialized = true;
      notifyListeners();
    }
  }

  /// Login user
  Future<Map<String, dynamic>> login(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.post(
        ApiEndpoints.login,
        body: {
          'email': email,
          'password': password,
        },
      );

      final tokenData = res['tokens'];
      final userData = res['user'];
      final businesses = res['businesses'] as List? ?? [];

      if (tokenData != null) {
        ApiClient.resetUnauthorizedHandling();
        await StorageService.setAccessToken(tokenData['access_token']);
        await StorageService.setRefreshToken(tokenData['refresh_token']);
      }

      if (userData != null) {
        _user = userData;
        await StorageService.setUserData(userData);
      }

      // If user has exactly one business, we can track if they are owner
      if (businesses.length == 1) {
        final firstBiz = businesses.first;
        _isOwner = firstBiz['is_owner'] == true;
        await StorageService.setIsOwner(_isOwner);
      }

      notifyListeners();
      return res as Map<String, dynamic>;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Register user and new business
  Future<Map<String, dynamic>> register({
    required String name,
    required String email,
    required String phone,
    required String password,
    required String businessName,
    String? outletName,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final res = await ApiClient.post(
        ApiEndpoints.register,
        body: {
          'name': name,
          'email': email,
          'phone': phone,
          'password': password,
          'business_name': businessName,
          if (outletName != null && outletName.isNotEmpty)
            'outlet_name': outletName,
        },
      );

      final tokenData = res['tokens'];
      final userData = res['user'];
      final businessData = res['business'];

      if (tokenData != null) {
        await StorageService.setAccessToken(tokenData['access_token']);
        await StorageService.setRefreshToken(tokenData['refresh_token']);
      }

      if (userData != null) {
        _user = userData;
        await StorageService.setUserData(userData);
      }

      if (businessData != null) {
        _isOwner = true;
        await StorageService.setIsOwner(true);
      }

      notifyListeners();
      return res as Map<String, dynamic>;
    } on ApiException catch (e) {
      _errorMessage = e.message;
      rethrow;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  /// Fetch user profile from /auth/me
  Future<void> fetchUserProfile() async {
    try {
      final res = await ApiClient.get(ApiEndpoints.getProfile);
      if (res != null && res['user'] != null) {
        _user = res['user'];
        await StorageService.setUserData(_user!);
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Fetch effective permissions for active business context
  Future<void> fetchMyPermissions() async {
    if (StorageService.getActiveBusinessId() == null) return;
    try {
      final res = await ApiClient.get(ApiEndpoints.myPermissions);
      if (res != null) {
        _isOwner = res['is_owner'] == true;
        await StorageService.setIsOwner(_isOwner);

        final rawPerms = res['permissions'] as List? ?? [];
        _permissions = rawPerms.map((p) => p.toString()).toList();
        await StorageService.setPermissions(_permissions);
        notifyListeners();
      }
    } catch (_) {}
  }

  /// Set effective permissions after business selection
  void updatePermissions({
    required List<String> permissions,
    required bool isOwner,
  }) {
    _permissions = permissions;
    _isOwner = isOwner;
    StorageService.setPermissions(permissions);
    StorageService.setIsOwner(isOwner);
    notifyListeners();
  }

  /// Logout user
  Future<void> logout() async {
    final token = StorageService.getAccessToken();
    await StorageService.clearAll();
    _user = null;
    _permissions = [];
    _isOwner = false;
    _errorMessage = null;
    notifyListeners();

    if (token != null && token.isNotEmpty) {
      try {
        await ApiClient.post(
          ApiEndpoints.logout,
          headers: {'Authorization': 'Bearer $token'},
        );
      } catch (_) {}
    }
  }
}
