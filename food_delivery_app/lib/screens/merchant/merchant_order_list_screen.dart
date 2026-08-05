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
      return _buildLoadingSkeleton();
    }

    if (_error != null) {
      return _buildErrorState();
    }

    if (_restaurant == null) {
      return _buildNoRestaurantState();
    }

    return Column(
      children: [
        // Header
        Container(
          padding: const EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Row(
            children: [
              const Icon(Icons.receipt_long, color: Color(0xFF064E3B), size: 22),
              const SizedBox(width: 8),
              const Text(
                'Orders',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1F2937),
                ),
              ),
            ],
          ),
        ),
        // Filter chips
        Container(
          padding: const EdgeInsets.only(bottom: 8),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                _buildFilterChip('All', null),
                ..._filterOptions.map((status) => Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: _buildFilterChip(_getStatusLabel(status), status),
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
                return _buildLoadingSkeleton();
              }

              if (snapshot.hasError) {
                return _buildErrorState();
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
                return _buildEmptyState();
              }

              return RefreshIndicator(
                onRefresh: () async {
                  setState(() {});
                },
                color: const Color(0xFF064E3B),
                child: ListView.builder(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                  itemCount: filteredOrders.length,
                  itemBuilder: (context, index) {
                    final order = filteredOrders[index];
                    return MerchantOrderCard(
                      order: order,
                      customerName: _customerNames[order.userId] ?? 'Loading...',
                    );
                  },
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildFilterChip(String label, OrderStatus? status) {
    final isSelected = _selectedFilter == status;
    return GestureDetector(
      onTap: () {
        setState(() {
          _selectedFilter = status;
        });
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF064E3B) : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? const Color(0xFF064E3B) : Colors.grey[300]!,
          ),
          boxShadow: isSelected
              ? [BoxShadow(color: const Color(0xFF064E3B).withOpacity(0.2), blurRadius: 6)]
              : [],
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFF4B5563),
            fontWeight: FontWeight.w600,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  Widget _buildLoadingSkeleton() {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: List.generate(3, (index) => Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: Colors.grey[200],
                    borderRadius: BorderRadius.circular(10),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(width: 120, height: 14, color: Colors.grey[200]),
                      const SizedBox(height: 6),
                      Container(width: 80, height: 10, color: Colors.grey[200]),
                    ],
                  ),
                ),
                Container(width: 60, height: 24, decoration: BoxDecoration(color: Colors.grey[200], borderRadius: BorderRadius.circular(20))),
              ],
            ),
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              height: 36,
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(10),
              ),
            ),
          ],
        ),
      )),
    );
  }

  Widget _buildErrorState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.red[50],
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.error_outline, size: 48, color: Colors.red[400]),
            ),
            const SizedBox(height: 20),
            const Text(
              'Something went wrong',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _error ?? 'Unknown error',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _error = null;
                });
                _loadRestaurant();
              },
              icon: const Icon(Icons.refresh),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF064E3B),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNoRestaurantState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.orange[50],
                shape: BoxShape.circle,
              ),
              child: Icon(Icons.store, size: 48, color: Colors.orange[400]),
            ),
            const SizedBox(height: 20),
            const Text(
              'No restaurant found',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              'Please set up your restaurant in settings to start receiving orders',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.pushNamed(context, '/restaurant-settings');
              },
              icon: const Icon(Icons.storefront),
              label: const Text('Set Up Restaurant'),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF064E3B),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFF064E3B).withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.receipt_long, size: 48, color: Color(0xFF064E3B)),
            ),
            const SizedBox(height: 20),
            Text(
              _selectedFilter != null
                  ? 'No ${_getStatusLabel(_selectedFilter!).toLowerCase()} orders'
                  : 'No orders yet',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            Text(
              _selectedFilter != null
                  ? 'Try selecting a different filter'
                  : 'New orders from customers will appear here automatically',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
          ],
        ),
      ),
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