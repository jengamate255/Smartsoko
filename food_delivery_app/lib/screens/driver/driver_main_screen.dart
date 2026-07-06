import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/order_service.dart';
import '../../services/auth_service.dart';
import '../../services/analytics_service.dart';
import '../../services/location_tracking_service.dart';
import '../../models/order.dart';
import '../../widgets/offline_indicator.dart';
import 'driver_order_card.dart';

class DriverMainScreen extends StatefulWidget {
  const DriverMainScreen({super.key});

  @override
  State<DriverMainScreen> createState() => _DriverMainScreenState();
}

class _DriverMainScreenState extends State<DriverMainScreen> {
  @override
  void initState() {
    super.initState();
    _startLocationTracking();
    
    // Log screen view
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<AnalyticsService>().logScreenView(
        screenName: 'driver_main',
        screenClass: 'DriverMainScreen',
      );
    });
  }

  Future<void> _startLocationTracking() async {
    final authService = context.read<AuthService>();
    final trackingService = context.read<LocationTrackingService>();
    
    final user = authService.currentUser;
    if (user != null) {
      await trackingService.startTracking(user.uid);
    }
  }

  @override
  void dispose() {
    // We don't stop tracking here because we want it to continue in background
    // until logout or app close.
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orderService = context.read<OrderService>();
    final authService = context.read<AuthService>();
    final riderId = authService.currentUser?.uid ?? '';

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Deliveries'),
        actions: [
          IconButton(
            icon: const Icon(Icons.person),
            onPressed: () {
              // Navigate to profile
            },
          ),
        ],
      ),
      body: Column(
        children: [
          const AnimatedOfflineIndicator(),
          Expanded(
            child: StreamBuilder<List<Order>>(
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
                            setState(() {});
                          },
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  );
                }

                final orders = snapshot.data ?? [];

                if (orders.isEmpty) {
                  return const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(
                          Icons.delivery_dining,
                          size: 60,
                          color: Colors.grey,
                        ),
                        SizedBox(height: 16),
                        Text(
                          'No orders assigned',
                          style: TextStyle(fontSize: 18, color: Colors.grey),
                        ),
                        SizedBox(height: 8),
                        Text(
                          'New orders will appear here',
                          style: TextStyle(fontSize: 14, color: Colors.grey),
                        ),
                      ],
                    ),
                  );
                }

                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: orders.length,
                  itemBuilder: (context, index) {
                    return DriverOrderCard(order: orders[index]);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
