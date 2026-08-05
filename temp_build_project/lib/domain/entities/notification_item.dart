class NotificationItem {
  final String id;
  final String title;
  final String body;
  final String? type;
  final String? relatedId;
  final bool isRead;
  final DateTime createdAt;

  NotificationItem({
    required this.id,
    required this.title,
    required this.body,
    this.type,
    this.relatedId,
    required this.isRead,
    required this.createdAt,
  });

  NotificationItem copyWith({bool? isRead}) {
    return NotificationItem(
      id: id,
      title: title,
      body: body,
      type: type,
      relatedId: relatedId,
      isRead: isRead ?? this.isRead,
      createdAt: createdAt,
    );
  }
}
