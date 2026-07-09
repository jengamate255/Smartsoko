import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/restaurant.dart';
import '../../models/order.dart';
import '../../models/payment.dart';
import '../../services/order_service.dart';
import '../../services/payment_service.dart';
import '../../services/restaurant_service.dart';
import '../../services/auth_service.dart';
import '../../services/analytics_service.dart';
import '../../services/nestjs_api_service.dart';
import '../../utils/constants.dart';
import 'order_tracking_screen.dart';

class CheckoutScreen extends StatefulWidget {
  final Restaurant restaurant;
  final Map<String, int> cartItems;

  const CheckoutScreen({
    super.key,
    required this.restaurant,
    required this.cartItems,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _addressController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;
  double _subtotal = 0.0;
  double _total = 0.0;
  
  // Payment status tracking
  PaymentStatus _paymentStatus = PaymentStatus.pending;
  String? _paymentId;
  String? _orderId;
  StreamSubscription<Payment?>? _paymentSubscription;
  Timer? _pollingTimer;
  
  // Retry mechanism
  static const int _maxRetries = 3;
  int _retryCount = 0;
  bool _canRetry = true;

  @override
  void initState() {
    super.initState();
    _calculateTotals();
  }

  @override
  void dispose() {
    _addressController.dispose();
    _phoneController.dispose();
    _paymentSubscription?.cancel();
    _pollingTimer?.cancel();
    super.dispose();
  }

  Future<void> _calculateTotals() async {
    final restaurantService = context.read<RestaurantService>();
    final menuItems = await restaurantService.getMenuItems(widget.restaurant.id).first;
    
    final subtotal = widget.cartItems.entries.fold(0.0, (sum, entry) {
      final item = menuItems.firstWhere(
        (m) => m.id == entry.key,
        orElse: () => MenuItem(
          id: '',
          restaurantId: '',
          name: '',
          description: '',
          price: 0,
          imageUrl: '',
          category: '',
          isAvailable: true,
        ),
      );
      return sum + (item.price * entry.value);
    });

    setState(() {
      _subtotal = subtotal;
      _total = subtotal + widget.restaurant.deliveryFee;
    });
  }

  void _startPaymentStatusPolling(String paymentId) {
    final paymentService = context.read<PaymentService>();
    
    // Use real-time stream for payment status updates
    _paymentSubscription = paymentService.getPaymentStream(paymentId).listen((payment) {
      if (payment != null && mounted) {
        setState(() {
          _paymentStatus = _mapMpesaStatusToPaymentStatus(payment.status);
        });
        
        // Navigate when payment is completed
        if (payment.status == MpesaTransactionStatus.success) {
          _pollingTimer?.cancel();
          _paymentSubscription?.cancel();
          _navigateToOrderTracking();
        } else if (payment.status == MpesaTransactionStatus.failed) {
          _pollingTimer?.cancel();
          _paymentSubscription?.cancel();
          _showPaymentError(payment.errorMessage ?? 'Payment failed');
        }
      }
    });

    // Fallback polling every 5 seconds as backup
    _pollingTimer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      final payment = await paymentService.getPayment(paymentId);
      if (payment != null && mounted) {
        setState(() {
          _paymentStatus = _mapMpesaStatusToPaymentStatus(payment.status);
        });
        
        if (payment.status == MpesaTransactionStatus.success) {
          timer.cancel();
          _paymentSubscription?.cancel();
          _navigateToOrderTracking();
        } else if (payment.status == MpesaTransactionStatus.failed) {
          timer.cancel();
          _paymentSubscription?.cancel();
          _showPaymentError(payment.errorMessage ?? 'Payment failed');
        }
      }
    });
  }

  PaymentStatus _mapMpesaStatusToPaymentStatus(MpesaTransactionStatus mpesaStatus) {
    switch (mpesaStatus) {
      case MpesaTransactionStatus.pending:
        return PaymentStatus.pending;
      case MpesaTransactionStatus.success:
        return PaymentStatus.completed;
      case MpesaTransactionStatus.failed:
        return PaymentStatus.failed;
    }
  }

  void _navigateToOrderTracking() {
    if (mounted && _orderId != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Payment successful!'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(
          builder: (_) => OrderTrackingScreen(orderId: _orderId!),
        ),
      );
    }
  }

  void _showPaymentError(String message) {
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Payment failed: $message'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _retryPayment() async {
    if (_retryCount >= _maxRetries) {
      setState(() => _canRetry = false);
      return;
    }

    if (_orderId == null || _phoneController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Cannot retry payment. Missing order or phone information.'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() {
      _retryCount++;
      _paymentStatus = PaymentStatus.pending;
      _isLoading = true;
    });

    try {
      final paymentService = context.read<PaymentService>();
      final authService = context.read<AuthService>();
      final user = await authService.getUser(authService.currentUser!.uid);
      if (user == null) throw Exception('User not found');

      // Initiate M-Pesa payment again
      final payment = await paymentService.initiateMpesaPayment(
        orderId: _orderId!,
        userId: user.id,
        amount: _total,
        phone: _phoneController.text,
      );

      if (mounted) {
        setState(() {
          _paymentId = payment.id;
          _paymentStatus = PaymentStatus.processing;
        });
        
        // Start polling for payment status
        _startPaymentStatusPolling(payment.id);

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Payment retry attempt ${_retryCount}/${_maxRetries} sent! Please check your phone.'),
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Retry failed: $e'), backgroundColor: Colors.red),
        );
        setState(() => _paymentStatus = PaymentStatus.failed);
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  Future<void> _proceedToPayment() async {
    if (_addressController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter delivery address')),
      );
      return;
    }

    if (_phoneController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter M-Pesa phone number')),
      );
      return;
    }

    setState(() => _isLoading = true);

    try {
      final orderService = context.read<OrderService>();
      final paymentService = context.read<PaymentService>();
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

      // Create order
      final order = await orderService.createOrder(
        userId: user.id,
        restaurantId: widget.restaurant.id,
        items: orderItems,
        subtotal: _subtotal,
        deliveryFee: widget.restaurant.deliveryFee,
        total: _total,
        deliveryAddress: _addressController.text,
        deliveryLat: user.lat,
        deliveryLng: user.lng,
      );

      // Store orderId for navigation
      _orderId = order.id;

      // Create delivery job in NestJS backend for driver dispatch
      final nestjsApi = context.read<NestJSApiService>();
      await nestjsApi.createDelivery(
        pickupName: widget.restaurant.name,
        pickupAddress: widget.restaurant.address,
        pickupLat: widget.restaurant.lat,
        pickupLng: widget.restaurant.lng,
        dropoffName: user.name ?? '',
        dropoffAddress: _addressController.text,
        dropoffLat: user.lat ?? 0.0,
        dropoffLng: user.lng ?? 0.0,
        customerName: user.name ?? '',
        customerPhone: user.phone,
        items: orderItems.map((item) => {
          'name': item.name,
          'quantity': item.quantity,
          'price': item.price,
          'notes': item.notes,
        }).toList(),
        totalAmount: _total,
        deliveryFee: widget.restaurant.deliveryFee,
        deliveryInstructions: '',
      );

      // Log order_placed event
      final analytics = context.read<AnalyticsService>();
      await analytics.logOrderPlaced(
        orderId: order.id,
        orderTotal: _total,
        itemCount: orderItems.fold(0, (sum, item) => sum + item.quantity),
      );

      // Initiate M-Pesa payment
      final payment = await paymentService.initiateMpesaPayment(
        orderId: order.id,
        userId: user.id,
        amount: _total,
        phone: _phoneController.text,
      );

      if (mounted) {
        // Start tracking payment status
        setState(() {
          _paymentId = payment.id;
          _paymentStatus = PaymentStatus.processing;
        });
        
        // Start polling for payment status
        _startPaymentStatusPolling(payment.id);

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Payment request sent! Please check your phone.'),
            duration: Duration(seconds: 3),
          ),
        );
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

  Widget _buildPaymentStatusWidget() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: _getStatusColor().withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: _getStatusColor()),
      ),
      child: Column(
        children: [
          Row(
            children: [
              if (_paymentStatus == PaymentStatus.processing)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else if (_paymentStatus == PaymentStatus.completed)
                const Icon(Icons.check_circle, color: Colors.green)
              else if (_paymentStatus == PaymentStatus.failed)
                const Icon(Icons.error, color: Colors.red)
              else
                const Icon(Icons.hourglass_empty, color: Colors.orange),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  _getStatusText(),
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    color: _getStatusColor(),
                  ),
                ),
              ),
              if (_paymentStatus == PaymentStatus.failed && _canRetry && _retryCount < _maxRetries)
                TextButton.icon(
                  onPressed: _retryPayment,
                  icon: const Icon(Icons.refresh, size: 18),
                  label: Text('Retry (${_maxRetries - _retryCount} left)'),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.orange,
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                ),
            ],
          ),
          if (_paymentStatus == PaymentStatus.processing) ...[
            const SizedBox(height: 8),
            const Text(
              'Waiting for payment confirmation...',
              style: TextStyle(fontSize: 12),
            ),
          ],
          if (_paymentStatus == PaymentStatus.failed && _retryCount >= _maxRetries) ...[
            const SizedBox(height: 8),
            const Text(
              'Maximum retry attempts reached. Please try again later.',
              style: TextStyle(fontSize: 12, color: Colors.red),
            ),
          ],
        ],
      ),
    );
  }

  Color _getStatusColor() {
    switch (_paymentStatus) {
      case PaymentStatus.pending:
        return Colors.orange;
      case PaymentStatus.processing:
        return Colors.blue;
      case PaymentStatus.completed:
        return Colors.green;
      case PaymentStatus.failed:
        return Colors.red;
      case PaymentStatus.refunded:
        return Colors.purple;
    }
  }

  String _getStatusText() {
    switch (_paymentStatus) {
      case PaymentStatus.pending:
        return 'Payment Pending';
      case PaymentStatus.processing:
        return 'Processing Payment';
      case PaymentStatus.completed:
        return 'Payment Completed';
      case PaymentStatus.failed:
        return 'Payment Failed';
      case PaymentStatus.refunded:
        return 'Payment Refunded';
    }
  }

  @override
  Widget build(BuildContext context) {
    final restaurantService = context.read<RestaurantService>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Checkout'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Restaurant info
                  Text(
                    widget.restaurant.name,
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                  const SizedBox(height: 16),

                  // Order items
                  Text(
                    'Order Summary',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  StreamBuilder<List<MenuItem>>(
                    stream: restaurantService.getMenuItems(widget.restaurant.id),
                    builder: (context, snapshot) {
                      final menuItems = snapshot.data ?? [];
                      if (menuItems.isEmpty) {
                        return const Center(child: CircularProgressIndicator());
                      }

                      return Column(
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
                            contentPadding: EdgeInsets.zero,
                            title: Text(menuItem.name),
                            subtitle: Text(AppConstants.formatPrice(menuItem.price)),
                            trailing: Text('x${entry.value}'),
                          );
                        }).toList(),
                      );
                    },
                  ),
                  const Divider(),

                  // Delivery address
                  const SizedBox(height: 16),
                  Text(
                    'Delivery Address',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _addressController,
                    decoration: const InputDecoration(
                      hintText: 'Enter your delivery address',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.location_on),
                    ),
                    maxLines: 2,
                  ),

                  // M-Pesa phone number
                  const SizedBox(height: 16),
                  Text(
                    'M-Pesa Payment',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _phoneController,
                    decoration: const InputDecoration(
                      hintText: 'Enter M-Pesa phone number',
                      border: OutlineInputBorder(),
                      prefixIcon: Icon(Icons.phone),
                      helperText: 'Format: 255XXXXXXXXX',
                    ),
                    keyboardType: TextInputType.phone,
                  ),
                  
                  // Payment status indicator
                  if (_paymentStatus != PaymentStatus.pending) ...[
                    const SizedBox(height: 16),
                    _buildPaymentStatusWidget(),
                  ],
                  
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),

          // Bottom summary
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
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Subtotal'),
                      Text(AppConstants.formatPrice(_subtotal)),
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
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                      Text(
                        AppConstants.formatPrice(_total),
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: _isLoading ? null : _proceedToPayment,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.orange,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                      ),
                      child: _isLoading
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text(
                              'Pay with M-Pesa',
                              style: TextStyle(fontSize: 16),
                            ),
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
