import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class StorageService {
  static const String _keyAccessToken = 'access_token';
  static const String _keyRefreshToken = 'refresh_token';
  static const String _keyUserData = 'user_data';
  static const String _keyBusinessId = 'active_business_id';
  static const String _keyBusinessName = 'active_business_name';
  static const String _keyOutletId = 'active_outlet_id';
  static const String _keyOutletName = 'active_outlet_name';
  static const String _keyPermissions = 'user_permissions';
  static const String _keyIsOwner = 'is_owner';

  static SharedPreferences? _prefs;

  static Future<void> init() async {
    _prefs ??= await SharedPreferences.getInstance();
  }

  // Tokens
  static String? getAccessToken() => _prefs?.getString(_keyAccessToken);
  static Future<bool> setAccessToken(String token) async =>
      _prefs?.setString(_keyAccessToken, token) ?? Future.value(false);

  static String? getRefreshToken() => _prefs?.getString(_keyRefreshToken);
  static Future<bool> setRefreshToken(String token) async =>
      _prefs?.setString(_keyRefreshToken, token) ?? Future.value(false);

  // User Profile
  static Map<String, dynamic>? getUserData() {
    final raw = _prefs?.getString(_keyUserData);
    if (raw == null) return null;
    try {
      return jsonDecode(raw) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<bool> setUserData(Map<String, dynamic> data) async =>
      _prefs?.setString(_keyUserData, jsonEncode(data)) ?? Future.value(false);

  // Business Context
  static int? getActiveBusinessId() => _prefs?.getInt(_keyBusinessId);
  static Future<bool> setActiveBusinessId(int id) async =>
      _prefs?.setInt(_keyBusinessId, id) ?? Future.value(false);

  static String? getActiveBusinessName() => _prefs?.getString(_keyBusinessName);
  static Future<bool> setActiveBusinessName(String name) async =>
      _prefs?.setString(_keyBusinessName, name) ?? Future.value(false);

  // Outlet Context
  static int? getActiveOutletId() => _prefs?.getInt(_keyOutletId);
  static Future<bool> setActiveOutletId(int id) async =>
      _prefs?.setInt(_keyOutletId, id) ?? Future.value(false);

  static String? getActiveOutletName() => _prefs?.getString(_keyOutletName);
  static Future<bool> setActiveOutletName(String name) async =>
      _prefs?.setString(_keyOutletName, name) ?? Future.value(false);

  // Dynamic Permissions
  static List<String> getPermissions() =>
      _prefs?.getStringList(_keyPermissions) ?? [];
  static Future<bool> setPermissions(List<String> permissions) async =>
      _prefs?.setStringList(_keyPermissions, permissions) ?? Future.value(false);

  static bool getIsOwner() => _prefs?.getBool(_keyIsOwner) ?? false;
  static Future<bool> setIsOwner(bool isOwner) async =>
      _prefs?.setBool(_keyIsOwner, isOwner) ?? Future.value(false);

  // Clear Session
  static Future<void> clearAll() async {
    await _prefs?.remove(_keyAccessToken);
    await _prefs?.remove(_keyRefreshToken);
    await _prefs?.remove(_keyUserData);
    await _prefs?.remove(_keyBusinessId);
    await _prefs?.remove(_keyBusinessName);
    await _prefs?.remove(_keyOutletId);
    await _prefs?.remove(_keyOutletName);
    await _prefs?.remove(_keyPermissions);
    await _prefs?.remove(_keyIsOwner);
  }
}
