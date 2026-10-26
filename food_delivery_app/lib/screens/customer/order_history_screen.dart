import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:smartsoko/services/order_service.dart';
import 'package:smartsoko/services/auth_service.dart';
import 'package:smartsoko/services/analytics_service.dart';
import 'package:smartsoko/models/order.dart';
import 'order_tracking_screen.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:smartsoko/config/app_config.dart';

class OrderHistoryScreen extends StatefulWidget {
  const OrderHistoryScreen({super.key});

  @override
  State<OrderHistoryScreen> createState() => _OrderHistoryScreenState();
}

class _OrderHistoryScreenState extends State<OrderHistoryScreen> {
  Future<void> _rateOrder(Order order) async {
    final products = order.items.where((item) => item.id.isNotEmpty).toList();
    if (products.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Product details are unavailable for this order.')));
      return;
    }
    var productId = products.first.id;
    var rating = 5;
    var saving = false;
    String? error;
    final comment = TextEditingController();
    await showDialog<void>(context: context, barrierDismissible: false, builder: (dialogContext) => StatefulBuilder(
      builder: (dialogContext, update) => AlertDialog(
        title: const Text('Rate a product from your order'),
        content: SingleChildScrollView(child: Column(mainAxisSize: MainAxisSize.min, children: [
          DropdownButtonFormField<String>(value: productId, decoration: const InputDecoration(labelText: 'Product'),
            items: {for (final item in products) item.id: item}.values.map((item) => DropdownMenuItem(value: item.id, child: Text(item.name))).toList(),
            onChanged: saving ? null : (value) => update(() => productId = value!)),
          DropdownButtonFormField<int>(value: rating, decoration: const InputDecoration(labelText: 'Rating'),
            items: List.generate(5, (index) => DropdownMenuItem(value: index + 1, child: Text('${index + 1} / 5'))),
            onChanged: saving ? null : (value) => update(() => rating = value!)),
          TextField(controller: comment, enabled: !saving, maxLength: 1000, decoration: const InputDecoration(labelText: 'Comment (optional)')),
          if (error != null) Text(error!, style: const TextStyle(color: Colors.red)),
        ])),
        actions: [TextButton(onPressed: saving ? null : () => Navigator.pop(dialogContext), child: const Text('Cancel')),
          FilledButton(onPressed: saving ? null : () async {
            update(() { saving = true; error = null; });
            try {
              final user = context.read<AuthService>().currentUser;
              if (user == null) throw Exception('Sign in to submit a review.');
              final token = await user.getIdToken();
              final response = await http.post(Uri.parse('${AppConfig.apiBaseUrl}/reviews'),
                headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer $token'},
                body: jsonEncode({'productId': productId, 'userId': user.uid, 'orderId': order.id, 'rating': rating, 'comment': comment.text.trim()})).timeout(const Duration(seconds: 15));
              final result = jsonDecode(response.body);
              if (response.statusCode != 200 || result['success'] != true) throw Exception(result['error'] ?? 'Could not save your review.');
              if (dialogContext.mounted) Navigator.pop(dialogContext);
              if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review submitted')));
            } catch (failure) {
              if (dialogContext.mounted) update(() { saving = false; error = failure.toString().replaceFirst('Exception: ', ''); });
            }
          }, child: Text(saving ? 'Submitting…' : 'Submit review'))],
      ),
    ));
    comment.dispose();
  }
  @override
  void initState() {
    super.initState();
    final analytics = context.read<AnalyticsService>();
    analytics.logScreenView(
      screenName: 'OrderHistory',
      screenClass: 'OrderHistoryScreen',
    );
  }

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.pending: return Colors.orange;
      case OrderStatus.confirmed: return Colors.blue;
      case OrderStatus.preparing: return Colors.purple;
      case OrderStatus.ready: return const Color(0xFF064E3B);
      case OrderStatus.pickedUp: return Colors.teal;
      case OrderStatus.delivered: return Colors.green;
      case OrderStatus.cancelled: return Colors.red;
    }
  }

  @override
  Widget build(BuildContext context) {
    final orderService = context.read<OrderService>();
    final authService = context.read<AuthService>();
    final userId = authService.currentUser?.uid ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      appBar: AppBar(
        title: const Text('My Orders', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF064E3B),
        elevation: 0,
      ),
      body: StreamBuilder<List<Order>>(
        stream: orderService.getUserOrders(userId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }

          final orders = snapshot.data ?? [];

          if (orders.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.receipt_long_outlined, size: 80, color: Colors.grey[300]),
                  const SizedBox(height: 16),
                  const Text(
                    'No orders yet',
                    style: TextStyle(fontSize: 18, color: Colors.grey, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  Text('Your delicious orders will appear here', style: TextStyle(color: Colors.grey[600])),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(20),
            itemCount: orders.length,
            itemBuilder: (context, index) {
              final order = orders[index];
              final isCompleted = order.status == OrderStatus.delivered;

              return Container(
                margin: const EdgeInsets.only(bottom: 16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withOpacity(0.04),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    )
                  ],
                ),
                child: InkWell(
                  onTap: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => OrderTrackingScreen(orderId: order.id),
                      ),
                    );
                  },
                  borderRadius: BorderRadius.circular(20),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                color: _getStatusColor(order.status).withOpacity(0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isCompleted ? Icons.check_circle_outline : Icons.local_shipping_outlined,
                                color: _getStatusColor(order.status),
                                size: 24,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Order #${order.id.substring(0, 8)}',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                  ),
                                  Text(
                                    order.status.name.toUpperCase(),
                                    style: TextStyle(
                                      color: _getStatusColor(order.status),
                                      fontSize: 12,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              'TSh ${order.total.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 18,
                                color: Color(0xFF064E3B),
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              '${order.items.length} items',
                              style: TextStyle(color: Colors.grey[600], fontSize: 14),
                            ),
                            if (isCompleted)
                              TextButton.icon(
                                onPressed: () => _rateOrder(order),
                                icon: const Icon(Icons.star_outline, size: 18),
                                label: const Text('Rate Order'),
                                style: TextButton.styleFrom(
                                  foregroundColor: Colors.orange,
                                  visualDensity: VisualDensity.compact,
                                ),
                              )
                            else
                              const Text(
                                'Track Now',
                                style: TextStyle(
                                  color: Color(0xFF064E3B),
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14,
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
