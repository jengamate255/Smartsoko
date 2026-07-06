class AppConstants {
  // Validation
  static const int minPhoneLength = 10;
  static const int maxPhoneLength = 15;
  static const int minAddressLength = 10;
  static const double minOrderAmount = 1.0;
  static const double maxOrderAmount = 1000000.0;
  
  // Timeouts
  static const Duration apiTimeout = Duration(seconds: 30);
  static const Duration uploadTimeout = Duration(minutes: 2);
  
  // Pagination
  static const int defaultPageSize = 20;
  static const int maxPageSize = 100;
  
  // Location
  static const double defaultSearchRadius = 10.0; // km
  static const double maxSearchRadius = 50.0; // km
  
  // Images
  static const int maxImageSizeBytes = 5 * 1024 * 1024; // 5MB
  static const double imageQuality = 0.8;
  
  // Error messages
  static const String networkError = 'No internet connection';
  static const String genericError = 'Something went wrong. Please try again.';
  static const String timeoutError = 'Request timed out. Please try again.';
  static const String permissionDenied = 'Permission denied';

  // Currency
  static const String currencyCode = 'TZS';
  static const String currencySymbol = 'TSh';

  /// Format price with TSh currency symbol
  static String formatPrice(double price) {
    return '$currencySymbol ${price.toStringAsFixed(0)}';
  }

  /// Format price with TSh currency symbol and comma separators
  static String formatPriceWithCommas(double price) {
    final formatted = price.toStringAsFixed(0);
    final buffer = StringBuffer();
    var count = 0;
    for (var i = formatted.length - 1; i >= 0; i--) {
      if (count == 3) {
        buffer.write(',');
        count = 0;
      }
      buffer.write(formatted[i]);
      count++;
    }
    return '$currencySymbol ${buffer.toString().split('').reversed.join()}';
  }
}
