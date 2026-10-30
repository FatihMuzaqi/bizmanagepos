class AppConfig {
  static const String appName = 'UsahaKu POS';
  static const String appVersion = '1.0.0';

  // Configurable base URL for Backend API
  // In development: http://127.0.0.1:5000/api/v1 or http://10.0.2.2:5000/api/v1 for Android emulator
  static String baseUrl = const String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://45ba-180-243-40-195.ngrok-free.app/api/v1',
  );

  static const Duration requestTimeout = Duration(seconds: 15);
}