import 'package:flutter/material.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../screens/merchant/merchant_order_detail_screen.dart';

class MerchantOrderCard extends StatelessWidget {
  final Order order;
  final String? customerName;
  final OrderService _orderService = OrderService();

  MerchantOrderCard({
    super.key,
    required this.order,
    this.customerName,
  });

  Color _getStatusColor() {
    switch (order.status) {
      case OrderStatus.pending:
        return Colors.orange;
      case OrderStatus.confirmed:
        return Colors.blue;
      case OrderStatus.preparing:
        return Colors.purple;
      case OrderStatus.ready:
        return Colors.green;
      case OrderStatus.pickedUp:
        return Colors.teal;
      case OrderStatus.delivered:
        return Colors.green;
      case OrderStatus.cancelled:
        return Colors.red;
    }
  }

  String _getStatusText() {
    switch (order.status) {
      case OrderStatus.pending:
        return 'Pending';
      case OrderStatus.confirmed:
        return 'Confirmed';
      case OrderStatus.preparing:
        return 'Preparing';
      case OrderStatus.ready:
        return 'Ready';
      case OrderStatus.pickedUp:
        return 'Picked Up';
      case OrderStatus.delivered:
        return 'Delivered';
      case OrderStatus.cancelled:
        return 'Cancelled';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => MerchantOrderDetailScreen(order: order),
            ),
          );
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Order ID and Status
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Order #${order.id.length >= 8 ? order.id.substring(0, 8) : order.id}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: _getStatusColor().withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _getStatusText(),
                      style: TextStyle(
                        color: _getStatusColor(),
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // Customer Name
              if (customerName != null) ...[
                Row(
                  children: [
                    const Icon(Icons.person, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        customerName!,
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
              ],

              // Order Items
              Row(
                children: [
                  const Icon(Icons.shopping_bag, size: 16, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      _getItemsSummary(),
                      style: const TextStyle(fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),

              // Time and Total
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.access_time, size: 16, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        _formatTime(order.createdAt),
                        style: const TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                    ],
                  ),
                  Text(
                    'TSh ${order.total.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),

              // Quick Action Buttons
              if (order.status == OrderStatus.pending ||
                  order.status == OrderStatus.confirmed ||
                  order.status == OrderStatus.preparing) ...[
                const SizedBox(height: 12),
                const Divider(),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (order.status == OrderStatus.pending)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _updateStatus(context, OrderStatus.confirmed),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.blue,
                            side: const BorderSide(color: Colors.blue),
                          ),
                          child: const Text('Confirm'),
                        ),
                      ),
                    if (order.status == OrderStatus.confirmed)
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _updateStatus(context, OrderStatus.preparing),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: Colors.purple,
                            side: const BorderSide(color: Colors.purple),
                          ),
                          child: const Text('Preparing'),
                        ),
                      ),
                    if (order.status == OrderStatus.preparing)
                      Expanded(
                        child: ElevatedButton(
                          onPressed: () => _updateStatus(context, OrderStatus.ready),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                          ),
                          child: const Text('Ready for Pickup'),
                        ),
                      ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  String _getItemsSummary() {
    if (order.items.isEmpty) {
      return 'No items';
    }
    return order.items.map((item) => '${item.quantity}x ${item.name}').join(', ');
  }

  String _formatTime(DateTime dateTime) {
    final now = DateTime.now();
    final diff = now.difference(dateTime);
    
    if (diff.inMinutes < 1) {
      return 'Just now';
    } else if (diff.inMinutes < 60) {
      return '${diff.inMinutes}m ago';
    } else if (diff.inHours < 24) {
      return '${diff.inHours}h ago';
    } else {
      return '${diff.inDays}d ago';
    }
  }

  Future<void> _updateStatus(BuildContext context, OrderStatus newStatus) async {
    try {
      await _orderService.updateOrderStatus(order.id, newStatus);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Order status updated to ${newStatus.name}'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Failed to update status: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}