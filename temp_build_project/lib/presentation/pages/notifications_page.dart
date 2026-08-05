import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:temp_build_project/domain/entities/app_notification.dart';
import 'package:temp_build_project/presentation/providers/notification_provider.dart';
import 'package:temp_build_project/presentation/widgets/empty_state.dart';
import 'package:temp_build_project/presentation/widgets/error_display.dart';

class NotificationsPage extends ConsumerStatefulWidget {
  const NotificationsPage({super.key});

  @override
  ConsumerState<NotificationsPage> createState() => _NotificationsPageState();
}

class _NotificationsPageState extends ConsumerState<NotificationsPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(notificationProvider.notifier).fetchNotifications();
    });
  }

  IconData _typeIcon(NotificationType type) {
    switch (type) {
      case NotificationType.tripUpdate:
        return Icons.directions_car;
      case NotificationType.promotion:
        return Icons.local_offer;
      case NotificationType.payment:
        return Icons.payment;
      case NotificationType.system:
        return Icons.info_outline;
    }
  }

  Color _typeColor(NotificationType type) {
    switch (type) {
      case NotificationType.tripUpdate:
        return Colors.blue;
      case NotificationType.promotion:
        return Colors.orange;
      case NotificationType.payment:
        return Colors.green;
      case NotificationType.system:
        return Colors.grey;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
    if (diff.inHours < 24) return '${diff.inHours}h ago';
    if (diff.inDays == 1) return 'Yesterday';
    return DateFormat('MMM dd').format(date);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final notifState = ref.watch(notificationProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        centerTitle: true,
        actions: [
          if (notifState.unreadCount > 0)
            TextButton(
              onPressed: () {
                ref.read(notificationProvider.notifier).markAllAsRead();
              },
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: notifState.isLoading && notifState.notifications.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : notifState.error != null && notifState.notifications.isEmpty
              ? ErrorDisplay(
                  message: notifState.error!,
                  onRetry: () {
                    ref.read(notificationProvider.notifier).fetchNotifications();
                  },
                )
              : notifState.notifications.isEmpty
                  ? const EmptyState(
                      icon: Icons.notifications_none,
                      title: 'No notifications',
                      subtitle: 'You\'re all caught up!',
                    )
                  : ListView.separated(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemCount: notifState.notifications.length,
                      separatorBuilder: (_, __) => const Divider(height: 1),
                      itemBuilder: (context, index) {
                        final notif = notifState.notifications[index];
                        return ListTile(
                          leading: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: _typeColor(notif.type).withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Icon(
                              _typeIcon(notif.type),
                              color: _typeColor(notif.type),
                              size: 22,
                            ),
                          ),
                          title: Text(
                            notif.title,
                            style: TextStyle(
                              fontWeight: notif.isRead ? FontWeight.normal : FontWeight.bold,
                            ),
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                notif.body,
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                                style: TextStyle(
                                  color: Colors.grey.shade600,
                                  fontSize: 13,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                _formatDate(notif.createdAt),
                                style: TextStyle(
                                  color: Colors.grey.shade400,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                          trailing: notif.isRead
                              ? null
                              : Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: Colors.blue,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                          onTap: () {
                            if (!notif.isRead) {
                              ref.read(notificationProvider.notifier).markAsRead(notif.id);
                            }
                          },
                        );
                      },
                    ),
    );
  }
}
