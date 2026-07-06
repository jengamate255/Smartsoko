import 'package:firebase_analytics/firebase_analytics.dart';

/// Analytics service that wraps Firebase Analytics with app-specific methods.
/// Provides unified interface for logging analytics events across all three apps.
class AnalyticsService {
  static final AnalyticsService _instance = AnalyticsService._internal();
  factory AnalyticsService() => _instance;
  AnalyticsService._internal();

  final FirebaseAnalytics _analytics = FirebaseAnalytics.instance;

  /// Logs an order placed event when a customer completes an order.
  /// 
  /// Parameters:
  /// - [orderId]: The unique identifier of the order
  /// - [orderTotal]: The total amount of the order
  /// - [itemCount]: The number of items in the order
  /// 
  /// Validates: Requirements 12.1
  Future<void> logOrderPlaced({
    required String orderId,
    required double orderTotal,
    required int itemCount,
  }) async {
    await _analytics.logEvent(
      name: 'order_placed',
      parameters: {
        'order_id': orderId,
        'order_total': orderTotal,
        'item_count': itemCount,
      },
    );
  }

  /// Logs a delivery completed event when a driver completes a delivery.
  /// 
  /// Parameters:
  /// - [orderId]: The unique identifier of the delivered order
  /// - [deliveryDuration]: Duration in minutes from pickup to delivery
  /// - [driverId]: The driver ID who completed the delivery
  /// - [orderTotal]: The total amount of the order
  /// - [deliveryAddress]: The delivery address
  /// 
  /// Validates: Requirements 12.2
  Future<void> logDeliveryCompleted({
    required String orderId,
    int? deliveryDurationMinutes,
    String? driverId,
    double? orderTotal,
    String? deliveryAddress,
  }) async {
    await _analytics.logEvent(
      name: 'delivery_completed',
      parameters: {
        'order_id': orderId,
        if (deliveryDurationMinutes != null)
          'delivery_duration_minutes': deliveryDurationMinutes,
        if (driverId != null) 'driver_id': driverId,
        if (orderTotal != null) 'order_total': orderTotal,
        if (deliveryAddress != null) 'delivery_address': deliveryAddress,
      },
    );
  }

  /// Logs an order confirmed event when a merchant confirms an order.
  /// 
  /// Parameters:
  /// - [orderId]: The unique identifier of the confirmed order
  /// - [estimatedPrepTime]: Estimated preparation time in minutes
  /// 
  /// Validates: Requirements 12.3
  Future<void> logOrderConfirmed({
    required String orderId,
    int? estimatedPrepTimeMinutes,
  }) async {
    await _analytics.logEvent(
      name: 'order_confirmed',
      parameters: {
        'order_id': orderId,
        if (estimatedPrepTimeMinutes != null)
          'estimated_prep_time_minutes': estimatedPrepTimeMinutes,
      },
    );
  }

  /// Logs a screen view event for screen transitions.
  /// 
  /// Parameters:
  /// - [screenName]: The name of the screen being viewed
  /// - [screenClass]: The class/type of the screen (optional)
  /// 
  /// Validates: Requirements 12.4, 12.5, 12.6
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {
    await _analytics.logEvent(
      name: 'screen_view',
      parameters: {
        'screen_name': screenName,
        if (screenClass != null) 'screen_class': screenClass,
      },
    );
  }

  /// Logs a generic event with custom parameters.
  /// 
  /// Parameters:
  /// - [name]: The event name
  /// - [parameters]: Optional map of event parameters
  Future<void> logEvent({
    required String name,
    Map<String, dynamic>? parameters,
  }) async {
    await _analytics.logEvent(
      name: name,
      parameters: parameters?.cast<String, Object>(),
    );
  }

  /// Sets the current user ID for analytics tracking.
  /// 
  /// Parameters:
  /// - [userId]: The user ID to set
  Future<void> setUserId(String? userId) async {
    await _analytics.setUserId(id: userId);
  }

  /// Sets user properties for analytics.
  /// 
  /// Parameters:
  /// - [name]: Property name
  /// - [value]: Property value
  Future<void> setUserProperty({
    required String name,
    required String value,
  }) async {
    await _analytics.setUserProperty(name: name, value: value);
  }
}