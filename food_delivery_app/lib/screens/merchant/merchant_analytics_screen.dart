import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/order.dart';
import '../../services/order_service.dart';
import '../../services/auth_service.dart';

class MerchantAnalyticsScreen extends StatelessWidget {
  const MerchantAnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final orderService = context.read<OrderService>();
    final authService = context.read<AuthService>();
    final userId = authService.currentUser?.uid ?? '';

    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      body: StreamBuilder<List<Order>>(
        stream: orderService.getMerchantOrders(userId),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final orders = snapshot.data ?? [];
          final deliveredOrders = orders.where((o) => o.status == OrderStatus.delivered).toList();
          final totalRevenue = deliveredOrders.fold(0.0, (sum, o) => sum + o.subtotal);
          final pendingOrders = orders.where((o) => o.status == OrderStatus.pending).length;

          return ListView(
            padding: const EdgeInsets.all(24),
            children: [
              const Text(
                'Performance Overview',
                style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF064E3B)),
              ),
              const SizedBox(height: 24),
              
              // Revenue Card
              _buildStatCard(
                title: 'Total Revenue',
                value: 'KSh ${totalRevenue.toStringAsFixed(0)}',
                subtitle: 'From ${deliveredOrders.length} orders',
                icon: Icons.payments_outlined,
                color: const Color(0xFF064E3B),
              ),
              const SizedBox(height: 16),

              Row(
                children: [
                  Expanded(
                    child: _buildStatCard(
                      title: 'New Orders',
                      value: pendingOrders.toString(),
                      subtitle: 'Pending action',
                      icon: Icons.shopping_bag_outlined,
                      color: Colors.orange,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildStatCard(
                      title: 'Success Rate',
                      value: orders.isEmpty ? '0%' : '${((deliveredOrders.length / orders.length) * 100).toStringAsFixed(0)}%',
                      subtitle: 'Delivered vs Total',
                      icon: Icons.trending_up,
                      color: Colors.blue,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 32),

              const Text(
                'Recent Activity',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
              ),
              const SizedBox(height: 16),

              ...orders.take(5).map((order) => Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10)],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: _getStatusColor(order.status).withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(Icons.history, size: 20, color: _getStatusColor(order.status)),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Order #${order.id.substring(0, 8)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                          Text(order.status.name.toUpperCase(), style: TextStyle(fontSize: 12, color: _getStatusColor(order.status))),
                        ],
                      ),
                    ),
                    Text('KSh ${order.total.toStringAsFixed(0)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
              )),
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatCard({
    required String title,
    required String value,
    required String subtitle,
    required IconData icon,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 15, offset: const Offset(0, 5))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 16),
          Text(value, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
          const SizedBox(height: 4),
          Text(title, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.grey)),
          Text(subtitle, style: TextStyle(fontSize: 12, color: Colors.grey[400])),
        ],
      ),
    );
  }

  Color _getStatusColor(OrderStatus status) {
    switch (status) {
      case OrderStatus.delivered: return Colors.green;
      case OrderStatus.pending: return Colors.orange;
      case OrderStatus.cancelled: return Colors.red;
      default: return Colors.blue;
    }
  }
}
