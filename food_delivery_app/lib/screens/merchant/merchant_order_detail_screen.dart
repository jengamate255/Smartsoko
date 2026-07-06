import 'package:flutter/material.dart';
import '../../models/order.dart';
import '../../models/user.dart';
import '../../services/analytics_service.dart';
import '../../services/auth_service.dart';
import '../../services/order_service.dart';

class MerchantOrderDetailScreen extends StatefulWidget {
  final Order order;

  const MerchantOrderDetailScreen({
    super.key,
    required this.order,
  });

  @override
  State<MerchantOrderDetailScreen> createState() => _MerchantOrderDetailScreenState();
}

class _MerchantOrderDetailScreenState extends State<MerchantOrderDetailScreen> {
  final AnalyticsService _analyticsService = AnalyticsService();
  final OrderService _orderService = OrderService();
  final AuthService _authService = AuthService();
  User? _customer;
  bool _isLoadingCustomer = true;
  bool _isUpdatingStatus = false;

  @override
  void initState() {
    super.initState();
    _logScreenView();
    _loadCustomerInfo();
  }

  Future<void> _logScreenView() async {
    await _analyticsService.logScreenView(
      screenName: 'MerchantOrderDetail',
      screenClass: 'MerchantOrderDetailScreen',
    );
  }

  Future<void> _loadCustomerInfo() async {
    try {
      final customer = await _authService.getUser(widget.order.userId);
      setState(() {
        _customer = customer;
        _isLoadingCustomer = false;
      });
    } catch (e) {
      setState(() {
        _isLoadingCustomer = false;
      });
    }
  }

  Color _getStatusColor() {
    switch (widget.order.status) {
      case OrderStatus.pending:
        return Colors.orange;
      case OrderStatus.confirmed:
        return Colors.blue;
      case OrderStatus.preparing:
        return Colors.purple;
      case OrderStatus.ready:
        return const Color(0xFF064E3B);
      case OrderStatus.pickedUp:
        return Colors.teal;
      case OrderStatus.delivered:
        return Colors.green;
      case OrderStatus.cancelled:
        return Colors.red;
    }
  }

  String _getStatusText() {
    switch (widget.order.status) {
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Order #${widget.order.id.substring(0, 8)}'),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF064E3B),
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status Section
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: _getStatusColor().withOpacity(0.1),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: _getStatusColor().withOpacity(0.2)),
              ),
              child: Row(
                children: [
                  Icon(Icons.info_outline, color: _getStatusColor()),
                  const SizedBox(width: 12),
                  const Text(
                    'Order Status',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500),
                  ),
                  const Spacer(),
                  Text(
                    _getStatusText(),
                    style: TextStyle(
                      color: _getStatusColor(),
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Customer Info
            const Text(
              'Customer Info',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
            ),
            const SizedBox(height: 12),
            if (_isLoadingCustomer)
              const Center(child: CircularProgressIndicator())
            else
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: const Color(0xFFC1ECD4),
                    child: Text(
                      (_customer?.name ?? 'U')[0].toUpperCase(),
                      style: const TextStyle(color: Color(0xFF064E3B), fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _customer?.name ?? 'Unknown Customer',
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      Text(
                        _customer?.phone ?? 'No phone provided',
                        style: TextStyle(color: Colors.grey[600], fontSize: 14),
                      ),
                    ],
                  ),
                ],
              ),
            const SizedBox(height: 32),

            // Order Items
            const Text(
              'Order Items',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
            ),
            const SizedBox(height: 12),
            ...widget.order.items.map((item) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF3F4F6),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      '${item.quantity}x',
                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF064E3B)),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(item.name, style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w500)),
                        if (item.notes != null)
                          Text(item.notes!, style: TextStyle(fontSize: 13, color: Colors.grey[600], fontStyle: FontStyle.italic)),
                      ],
                    ),
                  ),
                  Text('KSh ${(item.price * item.quantity).toStringAsFixed(0)}'),
                ],
              ),
            )),
            const Divider(height: 48, color: Color(0xFFE5E7EB)),

            // Summary
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Subtotal', style: TextStyle(color: Color(0xFF6B7280))),
                Text('KSh ${widget.order.subtotal.toStringAsFixed(0)}'),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Delivery Fee', style: TextStyle(color: Color(0xFF6B7280))),
                Text('KSh ${widget.order.deliveryFee.toStringAsFixed(0)}'),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Total Amount',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF064E3B)),
                ),
                Text(
                  'KSh ${widget.order.total.toStringAsFixed(0)}',
                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF064E3B)),
                ),
              ],
            ),
            const SizedBox(height: 48),

            // Action Buttons
            if (widget.order.status != OrderStatus.delivered && 
                widget.order.status != OrderStatus.cancelled && 
                widget.order.status != OrderStatus.pickedUp &&
                widget.order.status != OrderStatus.ready)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isUpdatingStatus ? null : _handleStatusUpdate,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF064E3B),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 18),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 0,
                  ),
                  child: _isUpdatingStatus
                      ? const CircularProgressIndicator(color: Colors.white)
                      : Text(
                          _getNextStatusAction(),
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                        ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  String _getNextStatusAction() {
    switch (widget.order.status) {
      case OrderStatus.pending:
        return 'Confirm Order';
      case OrderStatus.confirmed:
        return 'Start Preparing';
      case OrderStatus.preparing:
        return 'Mark as Ready';
      default:
        return 'Update Status';
    }
  }

  OrderStatus _getNextStatus() {
    switch (widget.order.status) {
      case OrderStatus.pending:
        return OrderStatus.confirmed;
      case OrderStatus.confirmed:
        return OrderStatus.preparing;
      case OrderStatus.preparing:
        return OrderStatus.ready;
      default:
        return widget.order.status;
    }
  }

  Future<void> _handleStatusUpdate() async {
    setState(() => _isUpdatingStatus = true);
    try {
      final nextStatus = _getNextStatus();
      await _orderService.updateOrderStatus(widget.order.id, nextStatus);
      
      if (nextStatus == OrderStatus.confirmed) {
        await _analyticsService.logOrderConfirmed(
          orderId: widget.order.id,
          estimatedPrepTimeMinutes: 30,
        );
      }
      
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order updated to ${nextStatus.name}')),
        );
        Navigator.pop(context);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating status: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isUpdatingStatus = false);
    }
  }
}