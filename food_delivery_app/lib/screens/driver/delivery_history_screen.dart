import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import '../../services/order_service.dart';
import '../../services/restaurant_service.dart';
import '../../services/auth_service.dart';
import '../../services/analytics_service.dart';
import '../../models/order.dart';
import '../../models/restaurant.dart';

class DeliveryHistoryScreen extends StatelessWidget {
  const DeliveryHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Log screen view
    WidgetsBinding.instance.addPostFrameCallback((_) {
      AnalyticsService().logScreenView(
        screenName: 'delivery_history',
        screenClass: 'DeliveryHistoryScreen',
      );
    });
    final orderService = context.read<OrderService>();
    final restaurantService = context.read<RestaurantService>();
    final authService = context.read<AuthService>();
    final riderId = authService.currentUser?.uid ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('Delivery History'),
      ),
      body: StreamBuilder<List<Order>>(
        stream: orderService.getRiderOrders(riderId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.error_outline,
                    size: 60,
                    color: Colors.red,
                  ),
                  const SizedBox(height: 16),
                  Text('Error: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      // Trigger rebuild
                      (context as Element).markNeedsBuild();
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final allOrders = snapshot.data ?? [];
          // Filter by delivered status
          final deliveredOrders = allOrders
              .where((order) => order.status == OrderStatus.delivered)
              .toList();

          if (deliveredOrders.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.history,
                    size: 60,
                    color: Colors.grey,
                  ),
                  SizedBox(height: 16),
                  Text(
                    'No completed deliveries',
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                  SizedBox(height: 8),
                  Text(
                    'Your delivery history will appear here',
                    style: TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: deliveredOrders.length,
            itemBuilder: (context, index) {
              final order = deliveredOrders[index];
              return DeliveryHistoryCard(
                order: order,
                restaurantService: restaurantService,
              );
            },
          );
        },
      ),
    );
  }
}

class DeliveryHistoryCard extends StatelessWidget {
  final Order order;
  final RestaurantService restaurantService;

  const DeliveryHistoryCard({
    super.key,
    required this.order,
    required this.restaurantService,
  });

  @override
  Widget build(BuildContext context) {
    final dateFormat = DateFormat('MMM dd, yyyy');
    final timeFormat = DateFormat('hh:mm a');
    final deliveryDate = order.deliveredAt ?? order.updatedAt ?? order.createdAt;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Date and Time
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.calendar_today, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Text(
                      dateFormat.format(deliveryDate),
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
                Text(
                  timeFormat.format(deliveryDate),
                  style: const TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            
            // Restaurant Name
            FutureBuilder<Restaurant?>(
              future: restaurantService.getRestaurant(order.restaurantId),
              builder: (context, restaurantSnapshot) {
                final restaurantName = restaurantSnapshot.data?.name ?? 
                    'Restaurant ID: ${order.restaurantId.substring(0, 8)}';
                
                return Row(
                  children: [
                    const Icon(Icons.restaurant, size: 16, color: Colors.grey),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        restaurantName,
                        style: const TextStyle(fontSize: 14),
                      ),
                    ),
                  ],
                );
              },
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
            
            const Divider(),
            const SizedBox(height: 8),
            
            // Earnings
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Earnings',
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey,
                  ),
                ),
                Text(
                  'TSh ${order.deliveryFee.toStringAsFixed(0)}',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: Colors.green,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
