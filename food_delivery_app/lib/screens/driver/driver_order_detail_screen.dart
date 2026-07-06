import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/order.dart';
import '../../models/restaurant.dart';
import '../../services/order_service.dart';
import '../../services/restaurant_service.dart';
import '../../services/analytics_service.dart';
import '../../services/auth_service.dart';
import '../../widgets/navigation_map_view.dart';

class DriverOrderDetailScreen extends StatefulWidget {
  final Order order;

  const DriverOrderDetailScreen({
    super.key,
    required this.order,
  });

  @override
  State<DriverOrderDetailScreen> createState() => _DriverOrderDetailScreenState();
}

class _DriverOrderDetailScreenState extends State<DriverOrderDetailScreen> {
  Restaurant? _restaurant;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _loadRestaurant();
    // Log screen view
    AnalyticsService().logScreenView(
      screenName: 'driver_order_detail',
      screenClass: 'DriverOrderDetailScreen',
    );
  }

  Future<void> _loadRestaurant() async {
    final restaurantService = context.read<RestaurantService>();
    final restaurant = await restaurantService.getRestaurant(widget.order.restaurantId);
    if (mounted) {
      setState(() {
        _restaurant = restaurant;
      });
    }
  }

  Future<void> _showConfirmationDialog(OrderStatus newStatus) async {
    final confirmed = await showGeneralDialog<bool>(
      context: context,
      barrierDismissible: true,
      barrierLabel: '',
      transitionDuration: const Duration(milliseconds: 200),
      pageBuilder: (context, anim1, anim2) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(
            newStatus == OrderStatus.pickedUp ? 'Confirm Pickup' : 'Confirm Delivery',
            style: const TextStyle(color: Color(0xFF064E3B), fontWeight: FontWeight.bold),
          ),
          content: Text(
            newStatus == OrderStatus.pickedUp
                ? 'Are you at the restaurant and have you received the order?'
                : 'Have you safely delivered the order to the customer?',
            style: const TextStyle(fontSize: 16),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF064E3B),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Confirm'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      await _updateOrderStatus(newStatus);
    }
  }

  Future<void> _updateOrderStatus(OrderStatus newStatus) async {
    setState(() => _isLoading = true);
    try {
      final orderService = context.read<OrderService>();
      await orderService.updateOrderStatus(widget.order.id, newStatus);
      
      if (newStatus == OrderStatus.delivered) {
        final analyticsService = AnalyticsService();
        final authService = context.read<AuthService>();
        final driverId = authService.currentUser?.uid ?? '';
        
        await analyticsService.logDeliveryCompleted(
          orderId: widget.order.id,
          driverId: driverId,
          orderTotal: widget.order.total,
          deliveryAddress: widget.order.deliveryAddress,
        );
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(newStatus == OrderStatus.pickedUp ? 'Order Picked Up!' : 'Order Delivered!'),
            backgroundColor: const Color(0xFF064E3B),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _openGoogleMaps() async {
    final lat = widget.order.status == OrderStatus.ready && _restaurant != null
        ? _restaurant!.lat
        : widget.order.deliveryLat;
    final lng = widget.order.status == OrderStatus.ready && _restaurant != null
        ? _restaurant!.lng
        : widget.order.deliveryLng;

    if (lat == null || lng == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Coordinates not available'), backgroundColor: Colors.red),
      );
      return;
    }

    final url = Uri.parse('https://www.google.com/maps/dir/?api=1&destination=$lat,$lng');
    if (await canLaunchUrl(url)) {
      await launchUrl(url, mode: LaunchMode.externalApplication);
    }
  }

  Color _getStatusColor() {
    switch (widget.order.status) {
      case OrderStatus.ready:
        return const Color(0xFF064E3B);
      case OrderStatus.pickedUp:
        return Colors.blue;
      case OrderStatus.delivered:
        return Colors.green;
      default:
        return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    final isReady = widget.order.status == OrderStatus.ready;
    final isPickedUp = widget.order.status == OrderStatus.pickedUp;

    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      appBar: AppBar(
        title: Text('Order #${widget.order.id.substring(0, 8)}', style: const TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF064E3B),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Header
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: _getStatusColor().withOpacity(0.1), shape: BoxShape.circle),
                    child: Icon(Icons.delivery_dining, color: _getStatusColor()),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Current Status', style: TextStyle(color: Colors.grey, fontSize: 13)),
                        Text(
                          widget.order.status.name.toUpperCase(),
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: _getStatusColor()),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Navigation Map
            if (widget.order.deliveryLat != null && widget.order.deliveryLng != null)
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Route Preview', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  NavigationMapView(
                    pickupLat: _restaurant?.lat ?? widget.order.deliveryLat!,
                    pickupLng: _restaurant?.lng ?? widget.order.deliveryLng!,
                    deliveryLat: widget.order.deliveryLat!,
                    deliveryLng: widget.order.deliveryLng!,
                    pickupAddress: _restaurant?.address ?? 'Restaurant',
                    deliveryAddress: widget.order.deliveryAddress,
                    showPickup: isReady,
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton.icon(
                    onPressed: _openGoogleMaps,
                    icon: const Icon(Icons.navigation_outlined),
                    label: const Text('Open in Google Maps'),
                    style: ElevatedButton.styleFrom(
                      minimumSize: const Size(double.infinity, 56),
                      backgroundColor: const Color(0xFF064E3B),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),

            // Pickup/Delivery Details
            const Text('Details', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            _buildDetailCard(
              title: 'Pickup From',
              name: _restaurant?.name ?? 'Loading...',
              address: _restaurant?.address ?? '',
              icon: Icons.store,
              isCurrent: isReady,
            ),
            const SizedBox(height: 12),
            _buildDetailCard(
              title: 'Deliver To',
              name: 'Customer',
              address: widget.order.deliveryAddress,
              icon: Icons.location_on,
              isCurrent: isPickedUp,
              notes: widget.order.riderNotes,
            ),
            const SizedBox(height: 32),

            // Items List
            _buildItemsCard(),
            const SizedBox(height: 48),

            // Final Actions
            if (isReady || isPickedUp)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () => _showConfirmationDialog(isReady ? OrderStatus.pickedUp : OrderStatus.delivered),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF064E3B),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          isReady ? 'Confirm Pickup' : 'Confirm Delivery',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailCard({
    required String title,
    required String name,
    required String address,
    required IconData icon,
    bool isCurrent = false,
    String? notes,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: isCurrent ? Border.all(color: const Color(0xFF064E3B), width: 2) : null,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: TextStyle(color: isCurrent ? const Color(0xFF064E3B) : Colors.grey, fontSize: 13, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(icon, size: 20, color: const Color(0xFF064E3B)),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Text(address, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
                    if (notes != null && notes.isNotEmpty) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(color: Colors.orange.withOpacity(0.1), borderRadius: BorderRadius.circular(8)),
                        child: Text('Note: $notes', style: const TextStyle(color: Colors.orange, fontSize: 12)),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildItemsCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Order Content', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          const Divider(height: 24),
          ...widget.order.items.map((item) => Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Text('${item.quantity}x', style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF064E3B))),
                const SizedBox(width: 12),
                Text(item.name),
                const Spacer(),
                Text('KSh ${(item.price * item.quantity).toStringAsFixed(0)}'),
              ],
            ),
          )),
          const Divider(height: 24),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Total to collect', style: TextStyle(fontWeight: FontWeight.bold)),
              Text('KSh ${widget.order.total.toStringAsFixed(0)}', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF064E3B))),
            ],
          ),
        ],
      ),
    );
  }
}
