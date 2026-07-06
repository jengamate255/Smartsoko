import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../services/location_service.dart';
import '../../services/auth_service.dart';
import 'rider_map_screen.dart';

class RiderHomeScreen extends StatefulWidget {
  const RiderHomeScreen({super.key});

  @override
  State<RiderHomeScreen> createState() => _RiderHomeScreenState();
}

class _RiderHomeScreenState extends State<RiderHomeScreen> {
  bool _isOnline = false;

  @override
  void initState() {
    super.initState();
    _startLocationUpdates();
  }

  Future<void> _startLocationUpdates() async {
    final locationService = context.read<LocationService>();
    final position = await locationService.getCurrentPosition();
    if (position != null) {
      await locationService.updateRiderLocation(
        'rider_${context.read<AuthService>().currentUser?.uid ?? 'current'}',
        position.latitude,
        position.longitude,
        isOnline: _isOnline,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final orderService = context.read<OrderService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Rider Dashboard'),
        actions: [
          TextButton.icon(
            onPressed: () async {
              setState(() => _isOnline = !_isOnline);
              await _startLocationUpdates();
            },
            icon: Icon(
              _isOnline ? Icons.toggle_on : Icons.toggle_off,
              color: _isOnline ? Colors.green : Colors.grey,
            ),
            label: Text(_isOnline ? 'Online' : 'Offline'),
          ),
        ],
      ),
      body: _isOnline
          ? StreamBuilder<List<Order>>(
              stream: orderService.getPendingOrders(),
              builder: (context, snapshot) {
                if (snapshot.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }

                final pendingOrders = snapshot.data ?? [];

                return Column(
                  children: [
                    Expanded(
                      child: pendingOrders.isEmpty
                          ? const Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.delivery_dining, size: 64, color: Colors.grey),
                                  SizedBox(height: 16),
                                  Text('No pending orders'),
                                ],
                              ),
                            )
                          : ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: pendingOrders.length,
                              itemBuilder: (context, index) {
                                final order = pendingOrders[index];
                                return _RiderOrderCard(order: order);
                              },
                            ),
                    ),
                  ],
                );
              },
            )
          : const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.toggle_off, size: 64, color: Colors.grey),
                  SizedBox(height: 16),
                  Text('You are offline'),
                  Text('Toggle online to start receiving orders'),
                ],
              ),
            ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const RiderMapScreen()),
          );
        },
        child: const Icon(Icons.map),
      ),
    );
  }
}

class _RiderOrderCard extends StatelessWidget {
  final Order order;

  const _RiderOrderCard({required this.order});

  @override
  Widget build(BuildContext context) {
    final orderService = context.read<OrderService>();
    final authService = context.read<AuthService>();

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Order #${order.id.substring(0, 8)}',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                Text(
                  'TZS ${order.total.toStringAsFixed(0)}',
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              order.items.map((e) => '${e.quantity}x ${e.name}').join(', '),
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                const Icon(Icons.location_on, size: 16, color: Colors.grey),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    order.deliveryAddress,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () async {
                  final riderId = 'rider_${authService.currentUser?.uid ?? 'current'}';
                  await orderService.assignRider(order.id, riderId);
                  await orderService.updateOrderStatus(order.id, OrderStatus.pickedUp);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.blue,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Accept Order'),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
