import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:temp_build_project/domain/entities/app_notification.dart';

class NotificationState {
  final List<AppNotification> notifications;
  final int unreadCount;
  final bool isLoading;
  final String? error;

  const NotificationState({
    this.notifications = const [],
    this.unreadCount = 0,
    this.isLoading = false,
    this.error,
  });

  NotificationState copyWith({
    List<AppNotification>? notifications,
    int? unreadCount,
    bool? isLoading,
    String? error,
  }) {
    return NotificationState(
      notifications: notifications ?? this.notifications,
      unreadCount: unreadCount ?? this.unreadCount,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class NotificationNotifier extends StateNotifier<NotificationState> {
  NotificationNotifier() : super(const NotificationState());

  Future<void> fetchNotifications() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(seconds: 1));
      final now = DateTime.now();
      final notifications = [
        AppNotification(
          id: 'notif_1',
          title: 'Driver is arriving',
          body: 'Your driver Mike will arrive in 3 minutes',
          type: NotificationType.tripUpdate,
          createdAt: now.subtract(const Duration(minutes: 30)),
          tripId: 'trip_1',
        ),
        AppNotification(
          id: 'notif_2',
          title: 'Trip completed',
          body: 'Your trip to Office has ended. Fare: \$24.80',
          type: NotificationType.tripUpdate,
          createdAt: now.subtract(const Duration(hours: 2)),
          tripId: 'trip_1',
        ),
        AppNotification(
          id: 'notif_3',
          title: 'Weekend promo!',
          body: 'Get 20% off on all rides this weekend',
          type: NotificationType.promotion,
          createdAt: now.subtract(const Duration(days: 1)),
        ),
        AppNotification(
          id: 'notif_4',
          title: 'Payment successful',
          body: 'Your wallet has been topped up with \$50.00',
          type: NotificationType.payment,
          createdAt: now.subtract(const Duration(days: 2)),
        ),
        AppNotification(
          id: 'notif_5',
          title: 'Welcome to the app!',
          body: 'Thank you for joining. Enjoy your first ride!',
          type: NotificationType.system,
          isRead: true,
          createdAt: now.subtract(const Duration(days: 7)),
        ),
      ];
      state = state.copyWith(
        notifications: notifications,
        unreadCount: notifications.where((n) => !n.isRead).length,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> markAsRead(String id) async {
    final updated = state.notifications.map((n) {
      if (n.id == id) return n.copyWith(isRead: true);
      return n;
    }).toList();
    state = state.copyWith(
      notifications: updated,
      unreadCount: updated.where((n) => !n.isRead).length,
    );
  }

  Future<void> markAllAsRead() async {
    final updated = state.notifications.map((n) => n.copyWith(isRead: true)).toList();
    state = state.copyWith(
      notifications: updated,
      unreadCount: 0,
    );
  }
}

final notificationProvider = StateNotifierProvider<NotificationNotifier, NotificationState>((ref) {
  return NotificationNotifier();
});
