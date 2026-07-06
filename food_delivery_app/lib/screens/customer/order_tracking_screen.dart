import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../services/analytics_service.dart';
import '../../utils/constants.dart';
import '../../services/restaurant_service.dart';
import '../../widgets/navigation_map_view.dart';
import '../../models/restaurant.dart';

class OrderTrackingScreen extends StatefulWidget {
  final String orderId;

  const OrderTrackingScreen({super.key, required this.orderId});

  @override
  State<OrderTrackingScreen> createState() => _OrderTrackingScreenState();
}

class _OrderTrackingScreenState extends State<OrderTrackingScreen> {
  Restaurant? _restaurant;

  @override
  void initState() {
    super.initState();
    final analytics = context.read<AnalyticsService>();
    analytics.logScreenView(
      screenName: 'OrderTracking',
      screenClass: 'OrderTrackingScreen',
    );
  }

  Future<void> _loadRestaurant(String restaurantId) async {
    if (_restaurant != null) return;
    final restaurantService = context.read<RestaurantService>();
    final restaurant = await restaurantService.getRestaurant(restaurantId);
    if (mounted) {
      setState(() {
        _restaurant = restaurant;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final orderService = context.read<OrderService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Order Tracking'),
      ),
      body: StreamBuilder<Order?>(
        stream: orderService.getOrderStream(widget.orderId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final order = snapshot.data;
          if (order == null) {
            return const Center(child: Text('Order not found'));
          }

          // Load restaurant details if not already loaded
          _loadRestaurant(order.restaurantId);

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _OrderStatusCard(order: order),
                const SizedBox(height: 16),
                if (order.deliveryLat != null && order.deliveryLng != null)
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Live Tracking',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      NavigationMapView(
                        pickupLat: _restaurant?.lat ?? order.deliveryLat!,
                        pickupLng: _restaurant?.lng ?? order.deliveryLng!,
                        deliveryLat: order.deliveryLat!,
                        deliveryLng: order.deliveryLng!,
                        pickupAddress: _restaurant?.address ?? 'Restaurant',
                        deliveryAddress: order.deliveryAddress,
                        showPickup: _restaurant != null,
                      ),
                      const SizedBox(height: 24),
                    ],
                  ),
                _OrderItemsCard(order: order),
                const SizedBox(height: 24),
                _DeliveryAddressCard(order: order),
                const SizedBox(height: 24),
                _PaymentCard(order: order),
              ],
            ),
          );
        },
      ),
    );
  }
}

class _OrderStatusCard extends StatelessWidget {
  final Order order;

  const _OrderStatusCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final steps = [
      _TrackingStep('Order Placed', OrderStatus.pending, Icons.receipt),
      _TrackingStep('Confirmed', OrderStatus.confirmed, Icons.check_circle),
      _TrackingStep('Preparing', OrderStatus.preparing, Icons.restaurant),
      _TrackingStep('Ready', OrderStatus.ready, Icons.delivery_dining),
      _TrackingStep('Picked Up', OrderStatus.pickedUp, Icons.local_shipping),
      _TrackingStep('Delivered', OrderStatus.delivered, Icons.home),
    ];

    final currentIndex = steps.indexWhere((s) => s.status == order.status);

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order Status',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...steps.asMap().entries.map((entry) {
              final index = entry.key;
              final step = entry.value;
              final isActive = index <= currentIndex && currentIndex >= 0;
              final isCurrent = index == currentIndex;

              return Row(
                children: [
                  Container(
                    width: 32,
                    height: 32,
                    decoration: BoxDecoration(
                      color: isActive ? Colors.orange : Colors.grey[300],
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      step.icon,
                      size: 16,
                      color: isActive ? Colors.white : Colors.grey,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Text(
                      step.title,
                      style: TextStyle(
                        fontWeight: isCurrent ? FontWeight.bold : FontWeight.normal,
                        color: isActive ? Colors.black : Colors.grey,
                      ),
                    ),
                  ),
                  if (isActive && isCurrent)
                    const Icon(Icons.arrow_forward, color: Colors.orange),
                ],
              );
            }),
          ],
        ),
      ),
    );
  }
}

class _TrackingStep {
  final String title;
  final OrderStatus status;
  final IconData icon;

  _TrackingStep(this.title, this.status, this.icon);
}

class _OrderItemsCard extends StatelessWidget {
  final Order order;

  const _OrderItemsCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Order Items',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            ...order.items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('${item.quantity}x ${item.name}'),
                  Text(AppConstants.formatPrice(item.price * item.quantity)),
                ],
              ),
            )),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal'),
                Text(AppConstants.formatPrice(order.subtotal)),
              ],
            ),
            const SizedBox(height: 4),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Delivery Fee'),
                Text(AppConstants.formatPrice(order.deliveryFee)),
              ],
            ),
            const Divider(),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Total', style: TextStyle(fontWeight: FontWeight.bold)),
                Text(AppConstants.formatPrice(order.total), style: const TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _DeliveryAddressCard extends StatelessWidget {
  final Order order;

  const _DeliveryAddressCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Delivery Address',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                const Icon(Icons.location_on, color: Colors.orange),
                const SizedBox(width: 12),
                Expanded(child: Text(order.deliveryAddress)),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PaymentCard extends StatelessWidget {
  final Order order;

  const _PaymentCard({required this.order});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Payment',
              style: Theme.of(context).textTheme.titleLarge,
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Method'),
                Row(
                  children: [
                    const Icon(Icons.phone_android, size: 16),
                    const SizedBox(width: 8),
                    Text(order.paymentStatus.name.toUpperCase()),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
