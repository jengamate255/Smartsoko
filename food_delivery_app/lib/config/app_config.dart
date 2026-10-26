import 'dart:collection';

import 'env_config.dart';

/// Map wrapper that returns empty strings instead of null for missing keys,
/// so call sites like `firebaseConfig['apiKey']` are non-nullable.
class _NonNullConfigMap extends MapMixin<String, String> {
  final Map<String, String> _backing;

  _NonNullConfigMap(this._backing);

  @override
  String operator [](Object? key) => _backing[key] ?? '';

  @override
  void operator []=(String key, String value) => _backing[key] = value;

  @override
  Iterable<String> get keys => _backing.keys;

  @override
  String? remove(Object? key) => _backing.remove(key);

  @override
  void clear() => _backing.clear();
}

/// Global app configuration shared by all SmartSoko entry points
/// (customer, merchant, driver, smartmove).
///
/// Values fall back to the known Firebase project credentials and can be
/// overridden by the `.env` file (see [EnvConfig]).
class AppConfig {
  AppConfig._();

  // ---- App flavor -------------------------------------------------
  static String _appType = 'customer';

  /// Current app flavor: 'customer', 'merchant', or 'driver'.
  static String get appType => _appType;

  static void setAppType(String type) => _appType = type;

  static const String appName = 'SmartSoko';

  /// Android emulators reach the development computer through 10.0.2.2.
  /// Physical devices and release builds should supply --dart-define=API_BASE_URL.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:3000/api',
  );

  // ---- Firebase ---------------------------------------------------
  static _NonNullConfigMap get firebaseConfig => _NonNullConfigMap({
    'apiKey': EnvConfig.firebaseApiKey,
    'authDomain': EnvConfig.firebaseAuthDomain,
    'projectId': EnvConfig.firebaseProjectId,
    'storageBucket': EnvConfig.firebaseStorageBucket,
    'messagingSenderId': EnvConfig.firebaseMessagingSenderId,
    'appId': EnvConfig.firebaseAppId,
    'databaseURL': EnvConfig.firebaseDatabaseUrl,
  });

  // ---- Firestore collection names ---------------------------------
  static const String usersCollection = 'users';
  static const String ordersCollection = 'orders';
  static const String paymentsCollection = 'payments';
  static const String ridersCollection = 'riders';
  static const String restaurantsCollection = 'restaurants';
  static const String menuItemsCollection = 'menu_items';

  // ---- Supabase ---------------------------------------------------
  static String get supabaseUrl => EnvConfig.supabaseUrl;
  static String get supabaseAnonKey => EnvConfig.supabaseAnonKey;

  // ---- Maps -------------------------------------------------------
  static String get mapboxToken => EnvConfig.mapboxToken;
}
