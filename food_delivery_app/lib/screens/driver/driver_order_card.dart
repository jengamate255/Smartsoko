import 'package:flutter/material.dart';
import '../../models/order.dart';
import '../../services/analytics_service.dart';
import '../../utils/constants.dart';
import 'driver_order_detail_screen.dart';

class DriverOrderCard extends StatelessWidget {
  final Order order;

  const DriverOrderCard({
    super.key,
    required this.order,
  });

  Color _getStatusColor() {
    switch (order.status) {
      case OrderStatus.pending:
      case OrderStatus.confirmed:
        return Colors.orange;
      case OrderStatus.preparing:
      case OrderStatus.ready:
        return Colors.blue;
      case OrderStatus.pickedUp:
        return Colors.purple;
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
        return 'Ready for Pickup';
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
          // Log screen view for order detail
          AnalyticsService().logScreenView(
            screenName: 'driver_order_detail',
            screenClass: 'DriverOrderDetailScreen',
          );
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => DriverOrderDetailScreen(order: order),
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
                    'Order #${order.id.substring(0, 8)}',
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
              
              // Restaurant Name
              Row(
                children: [
                  const Icon(Icons.restaurant, size: 16, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Restaurant ID: ${order.restaurantId.substring(0, 8)}',
                      style: const TextStyle(fontSize: 14),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              
              // Delivery Address
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on, size: 16, color: Colors.grey),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      order.deliveryAddress,
                      style: const TextStyle(fontSize: 14),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              
              // Total Amount
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total Amount',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey,
                    ),
                  ),
                  Text(
                    AppConstants.formatPrice(order.total),
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
