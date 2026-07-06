import 'package:flutter/material.dart';
import '../../models/order.dart';

class OrderStatusTimeline extends StatelessWidget {
  final Order order;

  const OrderStatusTimeline({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    final steps = [
      _TimelineStep('Pending', OrderStatus.pending, Icons.receipt, order.createdAt),
      _TimelineStep('Confirmed', OrderStatus.confirmed, Icons.check_circle, null),
      _TimelineStep('Preparing', OrderStatus.preparing, Icons.restaurant, null),
      _TimelineStep('Ready', OrderStatus.ready, Icons.delivery_dining, null),
      _TimelineStep('Picked Up', OrderStatus.pickedUp, Icons.local_shipping, null),
      _TimelineStep('Delivered', OrderStatus.delivered, Icons.home, null),
    ];

    final currentIndex = steps.indexWhere((s) => s.status == order.status);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: steps.asMap().entries.map((entry) {
        final index = entry.key;
        final step = entry.value;
        final isActive = index <= currentIndex && currentIndex >= 0;
        final isCurrent = index == currentIndex;
        final isLast = index == steps.length - 1;

        return Column(
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Timeline indicator
                Column(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: isActive ? Colors.orange : Colors.grey[300],
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        step.icon,
                        size: 20,
                        color: isActive ? Colors.white : Colors.grey,
                      ),
                    ),
                    if (!isLast)
                      Container(
                        width: 2,
                        height: 40,
                        color: isActive ? Colors.orange : Colors.grey[300],
                      ),
                  ],
                ),
                const SizedBox(width: 16),
                // Step details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        step.title,
                        style: TextStyle(
                          fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                          fontSize: 16,
                          color: isActive ? Colors.black : Colors.grey,
                        ),
                      ),
                      if (step.timestamp != null)
                        Text(
                          _formatTimestamp(step.timestamp!),
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      if (isCurrent)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Row(
                            children: [
                              SizedBox(
                                width: 12,
                                height: 12,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.orange),
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                'In Progress',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.orange,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
            if (!isLast) const SizedBox(height: 8),
          ],
        );
      }).toList(),
    );
  }

  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year} ${timestamp.hour}:${timestamp.minute.toString().padLeft(2, '0')}';
    }
  }
}

class _TimelineStep {
  final String title;
  final OrderStatus status;
  final IconData icon;
  final DateTime? timestamp;

  _TimelineStep(this.title, this.status, this.icon, this.timestamp);
}
