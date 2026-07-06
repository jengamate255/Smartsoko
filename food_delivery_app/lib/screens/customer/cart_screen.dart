import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/restaurant.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../services/restaurant_service.dart';
import '../../services/auth_service.dart';
import '../../services/analytics_service.dart';
import '../../utils/constants.dart';

class CartScreen extends StatefulWidget {
  final Restaurant restaurant;
  final Map<String, int> cartItems;

  const CartScreen({
    super.key,
    required this.restaurant,
    required this.cartItems,
  });

  @override
  State<CartScreen> createState() => _CartScreenState();
}

class _CartScreenState extends State<CartScreen> {
  final _addressController = TextEditingController();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final analytics = context.read<AnalyticsService>();
    analytics.logScreenView(
      screenName: 'Cart',
      screenClass: 'CartScreen',
    );
  }

  @override
  void dispose() {
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _placeOrder() async {
    if (_addressController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter delivery address')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final orderService = context.read<OrderService>();
      final restaurantService = context.read<RestaurantService>();
      final authService = context.read<AuthService>();

      final user = await authService.getUser(authService.currentUser!.uid);
      if (user == null) throw Exception('User not found');

      final menuItems = await restaurantService.getMenuItems(widget.restaurant.id).first;
      
      final orderItems = widget.cartItems.entries.map((entry) {
        final menuItem = menuItems.firstWhere((m) => m.id == entry.key);
        return OrderItem(
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: entry.value,
        );
      }).toList();

      final subtotal = orderItems.fold(0.0, (sum, item) => sum + (item.price * item.quantity));
      final total = subtotal + widget.restaurant.deliveryFee;

      final orderId = await orderService.createOrder(
        userId: user.id,
        restaurantId: widget.restaurant.id,
        items: orderItems,
        subtotal: subtotal,
        deliveryFee: widget.restaurant.deliveryFee,
        total: total,
        deliveryAddress: _addressController.text,
        deliveryLat: user.lat,
        deliveryLng: user.lng,
      );

      // Log order_placed event
      final analytics = context.read<AnalyticsService>();
      await analytics.logOrderPlaced(
        orderId: orderId.id,
        orderTotal: total,
        itemCount: orderItems.fold(0, (sum, item) => sum + item.quantity),
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Order placed successfully!')),
        );
        Navigator.of(context).popUntil((route) => route.isFirst);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final restaurantService = context.read<RestaurantService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Cart'),
      ),
      body: Column(
        children: [
          Expanded(
            child: StreamBuilder<List<MenuItem>>(
              stream: restaurantService.getMenuItems(widget.restaurant.id),
              builder: (context, snapshot) {
                final menuItems = snapshot.data ?? [];
                if (menuItems.isEmpty) {
                  return const Center(child: Text('Cart is empty'));
                }

                return ListView(
                  children: widget.cartItems.entries.map((entry) {
                    final menuItem = menuItems.firstWhere(
                      (m) => m.id == entry.key,
                      orElse: () => MenuItem(
                        id: '',
                        restaurantId: '',
                        name: 'Unknown',
                        description: '',
                        price: 0,
                        imageUrl: '',
                        category: '',
                        isAvailable: true,
                      ),
                    );
                    return ListTile(
                      title: Text(menuItem.name),
                      subtitle: Text(AppConstants.formatPrice(menuItem.price)),
                      trailing: Text('x${entry.value}'),
                    );
                  }).toList(),
                );
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.grey.withOpacity(0.3),
                  blurRadius: 10,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: SafeArea(
              child: Column(
                children: [
                  TextField(
                    controller: _addressController,
                    decoration: const InputDecoration(
                      labelText: 'Delivery Address',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.location_on),
                    ),
                    maxLines: 2,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal'),
                      FutureBuilder<List<MenuItem>>(
                        future: restaurantService.getMenuItems(widget.restaurant.id).first,
                        builder: (context, snapshot) {
                          final items = snapshot.data ?? [];
                          final cartSubtotal = widget.cartItems.entries.fold(0.0, (sum, entry) {
                            final item = items.firstWhere((m) => m.id == entry.key, orElse: () => MenuItem(id: '', restaurantId: '', name: '', description: '', price: 0, imageUrl: '', category: '', isAvailable: true));
                            return sum + (item.price * entry.value);
                          });
                          return Text(AppConstants.formatPrice(cartSubtotal));
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Delivery Fee'),
                      Text(AppConstants.formatPrice(widget.restaurant.deliveryFee)),
                    ],
                  ),
                  const Divider(),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      FutureBuilder<List<MenuItem>>(
                        future: restaurantService.getMenuItems(widget.restaurant.id).first,
                        builder: (context, snapshot) {
                          final items = snapshot.data ?? [];
                          final cartSubtotal = widget.cartItems.entries.fold(0.0, (sum, entry) {
                            final item = items.firstWhere((m) => m.id == entry.key, orElse: () => MenuItem(id: '', restaurantId: '', name: '', description: '', price: 0, imageUrl: '', category: '', isAvailable: true));
                            return sum + (item.price * entry.value);
                          });
                          final total = cartSubtotal + widget.restaurant.deliveryFee;
                          return Text(
                            AppConstants.formatPrice(total),
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          );
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _placeOrder,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF064E3B),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text('Place Order'),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
