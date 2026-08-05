class ApiConstants {
  ApiConstants._();

  static const String baseUrl = 'http://localhost:3000/api';

  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';
  static const String updateProfile = '/users/profile';

  static const String trips = '/trips';
  static const String tripEstimate = '/trips/estimate';
  static const String tripCancel = '/cancel';
  static const String tripRate = '/rate';
  static const String activeTrip = '/trips/active';

  static const String serviceTypes = '/services';

  static const String savedPlaces = '/users/locations';
  static const String nearbyDrivers = '/locations/drivers';

  static const String walletBalance = '/wallets/balance';
  static const String walletTransactions = '/wallets/transactions';
  static const String walletTopUp = '/wallets/deposit';

  static const String notifications = '/notifications';
  static const String markNotificationRead = '/notifications';

  static const String payments = '/payments/process';
  static const String paymentMethods = '/payments/methods';
}
