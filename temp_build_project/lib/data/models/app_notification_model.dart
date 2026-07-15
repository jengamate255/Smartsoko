import 'package:temp_build_project/domain/entities/app_notification.dart';

class AppNotificationModel {
  static NotificationType _parseType(String type) {
    switch (type) {
      case 'trip_update':
        return NotificationType.tripUpdate;
      case 'promotion':
        return NotificationType.promotion;
      case 'payment':
        return NotificationType.payment;
      case 'system':
        return NotificationType.system;
      default:
        return NotificationType.system;
    }
  }

  static AppNotification fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id'] as String,
      title: json['title'] as String,
      body: json['body'] as String,
      type: _parseType(json['type'] as String),
      isRead: json['is_read'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      tripId: json['trip_id'] as String?,
      imageUrl: json['image_url'] as String?,
    );
  }

  static Map<String, dynamic> toJson(AppNotification notification) {
    return {
      'id': notification.id,
      'title': notification.title,
      'body': notification.body,
      'type': notification.type.name,
      'is_read': notification.isRead,
      'created_at': notification.createdAt.toIso8601String(),
      'trip_id': notification.tripId,
      'image_url': notification.imageUrl,
    };
  }
}
