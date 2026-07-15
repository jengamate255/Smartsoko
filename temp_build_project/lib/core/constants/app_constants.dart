class AppConstants {
  static const String appName = 'Food Delivery';
  static const String baseUrl = 'http://10.0.2.2:3000/api';
  static const String socketUrl = 'http://10.0.2.2:3000';
  static const String googleMapsApiKey = 'YOUR_GOOGLE_MAPS_API_KEY';
  static const int maxRetries = 3;
  static const String currencySymbol = '\$';

  static const Duration connectTimeout = Duration(seconds: 10);
  static const Duration receiveTimeout = Duration(seconds: 15);

  static const double defaultMapLatitude = 40.7128;
  static const double defaultMapLongitude = -74.0060;
  static const double defaultMapZoom = 15.0;
}
