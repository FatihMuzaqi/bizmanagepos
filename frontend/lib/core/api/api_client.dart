import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import '../constants/app_config.dart';
import '../storage/storage_service.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? errorCode;
  final dynamic errors;

  ApiException({
    required this.statusCode,
    required this.message,
    this.errorCode,
    this.errors,
  });

  @override
  String toString() => 'ApiException($statusCode, $message, code: $errorCode)';
}

class ApiClient {
  static final http.Client _client = http.Client();
  static void Function()? onUnauthorized;

  static Uri _buildUri(String endpoint, [Map<String, dynamic>? queryParams]) {
    final base = AppConfig.baseUrl.endsWith('/')
        ? AppConfig.baseUrl.substring(0, AppConfig.baseUrl.length - 1)
        : AppConfig.baseUrl;
    final path = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    final fullUrl = '$base$path';

    if (queryParams == null || queryParams.isEmpty) {
      return Uri.parse(fullUrl);
    }

    // Filter null query params
    final cleanParams = <String, String>{};
    queryParams.forEach((key, value) {
      if (value != null) {
        cleanParams[key] = value.toString();
      }
    });

    return Uri.parse(fullUrl).replace(queryParameters: cleanParams);
  }

  static Map<String, String> _buildHeaders([Map<String, String>? customHeaders]) {
    final headers = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'ngrok-skip-browser-warning': 'true',
    };

    final token = StorageService.getAccessToken();
    if (token != null && token.isNotEmpty) {
      headers['Authorization'] = 'Bearer $token';
    }

    final businessId = StorageService.getActiveBusinessId();
    if (businessId != null) {
      headers['X-Business-Id'] = businessId.toString();
    }

    if (customHeaders != null) {
      headers.addAll(customHeaders);
    }

    return headers;
  }

  static bool _isAuthPath(String endpoint) {
    return endpoint.contains('/auth/login') ||
        endpoint.contains('/auth/register') ||
        endpoint.contains('/auth/logout') ||
        endpoint.contains('/auth/refresh-token');
  }

  static Future<dynamic> get(
    String endpoint, {
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
  }) async {
    return _sendRequest(
      () => _client.get(
        _buildUri(endpoint, queryParams),
        headers: _buildHeaders(headers),
      ),
      isAuthEndpoint: _isAuthPath(endpoint),
    );
  }

  static Future<dynamic> post(
    String endpoint, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
  }) async {
    return _sendRequest(
      () => _client.post(
        _buildUri(endpoint, queryParams),
        headers: _buildHeaders(headers),
        body: body != null ? jsonEncode(body) : null,
      ),
      isAuthEndpoint: _isAuthPath(endpoint),
    );
  }

  static Future<dynamic> put(
    String endpoint, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
  }) async {
    return _sendRequest(
      () => _client.put(
        _buildUri(endpoint, queryParams),
        headers: _buildHeaders(headers),
        body: body != null ? jsonEncode(body) : null,
      ),
      isAuthEndpoint: _isAuthPath(endpoint),
    );
  }

  static Future<dynamic> delete(
    String endpoint, {
    dynamic body,
    Map<String, dynamic>? queryParams,
    Map<String, String>? headers,
  }) async {
    return _sendRequest(
      () => _client.delete(
        _buildUri(endpoint, queryParams),
        headers: _buildHeaders(headers),
        body: body != null ? jsonEncode(body) : null,
      ),
      isAuthEndpoint: _isAuthPath(endpoint),
    );
  }

  static bool _isHandlingUnauthorized = false;

  static void resetUnauthorizedHandling() {
    _isHandlingUnauthorized = false;
  }

  static Future<dynamic> _sendRequest(
    Future<http.Response> Function() requestFn, {
    bool isRetry = false,
    bool isAuthEndpoint = false,
  }) async {
    try {
      final response = await requestFn().timeout(AppConfig.requestTimeout);

      // Handle 401 Token Expired & Attempt Refresh (ignore if already on auth endpoint)
      if (response.statusCode == 401 && !isRetry && !isAuthEndpoint) {
        final refreshed = await _attemptRefreshToken();
        if (refreshed) {
          return _sendRequest(requestFn, isRetry: true);
        } else {
          if (!_isHandlingUnauthorized) {
            _isHandlingUnauthorized = true;
            onUnauthorized?.call();
          }
          throw ApiException(
            statusCode: 401,
            message: 'Session expired. Please log in again.',
            errorCode: 'UNAUTHORIZED',
          );
        }
      }

      return _processResponse(response);
    } on ApiException {
      rethrow;
    } on TimeoutException {
      throw ApiException(
        statusCode: 408,
        message: 'Connection timed out. Please check your network.',
        errorCode: 'REQUEST_TIMEOUT',
      );
    } catch (e) {
      throw ApiException(
        statusCode: 500,
        message: 'Network error or unable to connect to server: $e',
        errorCode: 'NETWORK_ERROR',
      );
    }
  }

  static dynamic _processResponse(http.Response response) {
    dynamic decoded;
    try {
      decoded = jsonDecode(response.body);
    } catch (_) {
      decoded = null;
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      if (decoded is Map<String, dynamic> && decoded.containsKey('data')) {
        return decoded['data'];
      }
      return decoded;
    }

    String message = 'An unexpected error occurred';
    String? errorCode;
    dynamic errors;

    if (decoded is Map<String, dynamic>) {
      message = decoded['message'] ?? message;
      errorCode = decoded['error_code'];
      errors = decoded['errors'];

      // If backend returned detailed field validation errors, extract the first one for clear user feedback
      if (errors is List && errors.isNotEmpty) {
        final firstErr = errors.first;
        if (firstErr is Map && firstErr['message'] != null) {
          message = firstErr['message'].toString();
        }
      }
    }

    if (response.statusCode == 403) {
      if (errorCode == 'INSUFFICIENT_PERMISSIONS' || errorCode == 'FORBIDDEN') {
        message = "You don't have permission to perform this action.";
      }
    }

    throw ApiException(
      statusCode: response.statusCode,
      message: message,
      errorCode: errorCode,
      errors: errors,
    );
  }

  static Future<bool> _attemptRefreshToken() async {
    final currentRefreshToken = StorageService.getRefreshToken();
    if (currentRefreshToken == null || currentRefreshToken.isEmpty) {
      return false;
    }

    try {
      final uri = _buildUri('/auth/refresh-token');
      final res = await _client.post(
        uri,
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: jsonEncode({'refresh_token': currentRefreshToken}),
      );

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final tokenData = data['data'] ?? data;
        if (tokenData != null && tokenData['access_token'] != null) {
          await StorageService.setAccessToken(tokenData['access_token']);
          if (tokenData['refresh_token'] != null) {
            await StorageService.setRefreshToken(tokenData['refresh_token']);
          }
          return true;
        }
      }
    } catch (_) {
      return false;
    }
    return false;
  }
}
