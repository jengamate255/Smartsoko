import 'package:flutter/material.dart';
import '../../models/order.dart';
import '../../models/restaurant.dart';
import '../../models/user.dart';
import '../../services/analytics_service.dart';
import '../../services/auth_service.dart';
import '../../services/order_service.dart';
import '../../services/restaurant_service.dart';
import '../../widgets/merchant/merchant_order_card.dart';

class MerchantOrderListScreen extends StatefulWidget {
  const MerchantOrderListScreen({super.key});

  @override
  State<MerchantOrderListScreen> createState() => _MerchantOrderListScreenState();
}

class _MerchantOrderListScreenState extends State<MerchantOrderListScreen> {
  final AnalyticsService _analyticsService = AnalyticsService();

  final AuthService _authService = AuthService();
  final OrderService _orderService = OrderService();
  final RestaurantService _restaurantService = RestaurantService();

  Restaurant? _restaurant;
  bool _isLoading = true;
  String? _error;
  OrderStatus? _selectedFilter;
  final Map<String, String> _customerNames = {};

  final List<OrderStatus> _filterOptions = [
    OrderStatus.pending,
    OrderStatus.confirmed,
    OrderStatus.preparing,
    OrderStatus.ready,
  ];

  @override
  void initState() {
    super.initState();
    _loadRestaurant();
    _logScreenView();
  }

  Future<void> _logScreenView() async {
    await _analyticsService.logScreenView(
      screenName: 'MerchantOrderList',
      screenClass: 'MerchantOrderListScreen',
    );
  }

  Future<void> _loadRestaurant() async {
    try {
      final user = _authService.currentUser;
      if (user == null) {
        setState(() {
          _error = 'User not authenticated';
          _isLoading = false;
        });
        return;
      }

      final restaurant = await _restaurantService.getRestaurantByOwnerId(user.uid);
      setState(() {
        _restaurant = restaurant;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<String?> _getCustomerName(String userId) async {
    if (_customerNames.containsKey(userId)) {
      return _customerNames[userId];
    }
    try {
      final user = await _authService.getUser(userId);
      if (user != null && user.name != null && user.name!.isNotEmpty) {
        setState(() {
          _customerNames[userId] = user.name!;
        });
        return user.name;
      }
    } catch (e) {
      // Ignore errors, return null
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _error = null;
                });
                _loadRestaurant();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_restaurant == null) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.store, size: 48, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No restaurant found',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Please set up your restaurant in settings',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return Column(
      children: [
        // Filter chips
        Container(
          padding: const EdgeInsets.symmetric(vertical: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('All'),
                  selected: _selectedFilter == null,
                  onSelected: (selected) {
                    setState(() {
                      _selectedFilter = null;
                    });
                  },
                ),
                const SizedBox(width: 8),
                ..._filterOptions.map((status) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(_getStatusLabel(status)),
                    selected: _selectedFilter == status,
                    onSelected: (selected) {
                      setState(() {
                        _selectedFilter = selected ? status : null;
                      });
                    },
                  ),
                )),
              ],
            ),
          ),
        ),
        // Orders list
        Expanded(
          child: StreamBuilder<List<Order>>(
            stream: _orderService.getRestaurantOrders(_restaurant!.id),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return Center(
                  child: Text('Error: ${snapshot.error}'),
                );
              }

              final orders = snapshot.data ?? [];
              
              // Apply filter
              final filteredOrders = _selectedFilter != null
                  ? orders.where((order) => order.status == _selectedFilter).toList()
                  : orders;

              // Fetch customer names for all orders
              for (final order in filteredOrders) {
                if (!_customerNames.containsKey(order.userId)) {
                  _getCustomerName(order.userId);
                }
              }

              if (filteredOrders.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.receipt_long,
                        size: 60,
                        color: Colors.grey,
                      ),
                      const SizedBox(height: 16),
                      Text(
                        _selectedFilter != null
                            ? 'No ${_getStatusLabel(_selectedFilter!).toLowerCase()} orders'
                            : 'No orders yet',
                        style: const TextStyle(fontSize: 18, color: Colors.grey),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'New orders will appear here',
                        style: TextStyle(fontSize: 14, color: Colors.grey),
                      ),
                    ],
                  ),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: filteredOrders.length,
                itemBuilder: (context, index) {
                  final order = filteredOrders[index];
                  return MerchantOrderCard(
                    order: order,
                    customerName: _customerNames[order.userId] ?? 'Loading...',
                  );
                },
              );
            },
          ),
        ),
      ],
    );
  }

  String _getStatusLabel(OrderStatus status) {
    switch (status) {
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
}