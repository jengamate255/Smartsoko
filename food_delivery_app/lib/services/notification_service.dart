import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationService {
  static final NotificationService _instance = NotificationService._internal();
  factory NotificationService() => _instance;
  NotificationService._internal();

  final FlutterLocalNotificationsPlugin _notifications =
      FlutterLocalNotificationsPlugin();

  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _notifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    _isInitialized = true;
  }

  void _onNotificationTapped(NotificationResponse response) {
    // Handle notification tap - can be extended to navigate to specific screens
  }

  Future<void> showOrderNotification({
    required String orderId,
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'order_notifications',
      'Order Notifications',
      channelDescription: 'Notifications for new orders',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      orderId.hashCode,
      title,
      body,
      details,
      payload: payload ?? orderId,
    );
  }

  Future<void> showDeliveryNotification({
    required String orderId,
    required String title,
    required String body,
    String? payload,
  }) async {
    const androidDetails = AndroidNotificationDetails(
      'delivery_notifications',
      'Delivery Notifications',
      channelDescription: 'Notifications for delivery updates',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
    );

    const iosDetails = DarwinNotificationDetails(
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    const details = NotificationDetails(
      android: androidDetails,
      iOS: iosDetails,
    );

    await _notifications.show(
      orderId.hashCode,
      title,
      body,
      details,
      payload: payload ?? orderId,
    );
  }

  Future<void> cancelNotification(String orderId) async {
    await _notifications.cancel(orderId.hashCode);
  }

  Future<void> cancelAllNotifications() async {
    await _notifications.cancelAll();
  }
}