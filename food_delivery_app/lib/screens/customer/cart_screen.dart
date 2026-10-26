import 'dart:async';

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:smartsoko/models/restaurant.dart';
import 'package:smartsoko/models/order.dart';
import 'package:smartsoko/services/order_service.dart';
import 'package:smartsoko/services/payment_service.dart';
import 'package:smartsoko/services/restaurant_service.dart';
import 'package:smartsoko/services/auth_service.dart';
import 'package:smartsoko/services/analytics_service.dart';
import 'package:smartsoko/services/cart_service.dart';
import 'package:smartsoko/utils/constants.dart';
import 'package:smartsoko/utils/logger.dart';

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
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _isLoading = false;

  /// `cod` or `pesapal`. Online payment needs a signed-in customer, because
  /// the server refuses to start a PesaPal checkout without a payer identity.
  String _paymentMethod = 'cod';

  /// Prices for this cart, quoted by the API server. Ordering stays disabled
  /// until the quote arrives so the amount charged is the amount shown.
  OrderQuote? _quote;
  bool _quoteLoading = true;
  String? _quoteError;

  @override
  void initState() {
    super.initState();
    final analytics = context.read<AnalyticsService>();
    analytics.logScreenView(screenName: 'Cart', screenClass: 'CartScreen');
    _loadQuote();
    _prefillContact();
  }

  @override
  void dispose() {
    _addressController.dispose();
    _nameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _loadQuote() async {
    final orderService = context.read<OrderService>();
    try {
      final quote = await orderService.quoteOrder(
        itemQuantities: widget.cartItems,
      );
      if (!mounted) return;
      setState(() {
        _quote = quote;
        _quoteError = null;
        _quoteLoading = false;
      });
    } catch (e) {
      AppLogger.warning('Cart quote failed: $e');
      if (!mounted) return;
      setState(() {
        _quoteError = '$e';
        _quoteLoading = false;
      });
    }
  }

  /// Pre-fills name and phone from the profile when there is one. Demo sessions
  /// have no user, so a guest simply types them.
  Future<void> _prefillContact() async {
    final authService = context.read<AuthService>();
    final firebaseUser = authService.currentUser;
    if (firebaseUser == null) return;

    final user = await authService.getUser(firebaseUser.uid);
    if (user == null || !mounted) return;

    setState(() {
      if (user.phone.isNotEmpty) _phoneController.text = user.phone;
      final name = user.name;
      if (name != null && name.isNotEmpty) _nameController.text = name;
    });
  }

  void _showMessage(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _placeOrder() async {
    if (_addressController.text.trim().isEmpty) {
      _showMessage('Please enter delivery address');
      return;
    }

    final phone = _phoneController.text.trim();
    if (phone.length < 10 || phone.length > 20) {
      _showMessage('Please enter a contact phone number');
      return;
    }

    final quote = _quote;
    if (quote == null) {
      _showMessage('Could not price your cart. Please try again.');
      return;
    }

    setState(() => _isLoading = true);

    try {
      final orderService = context.read<OrderService>();
      final restaurantService = context.read<RestaurantService>();
      final authService = context.read<AuthService>();
      final paymentService = context.read<PaymentService>();
      final analytics = context.read<AnalyticsService>();

      // A demo session has no Firebase user and a signed-in session may have no
      // profile yet; both place an order as a guest.
      final firebaseUser = authService.currentUser;
      final user = firebaseUser == null
          ? null
          : await authService.getUser(firebaseUser.uid);

      // Paying online needs a session: the server answers "Sign in to pay
      // online" otherwise, so ask for it before creating the order.
      String? idToken;
      if (_paymentMethod != 'cod') {
        idToken = await authService.getIdToken();
        if (idToken == null) {
          _showMessage('Sign in to pay online, or choose cash on delivery.');
          setState(() => _isLoading = false);
          return;
        }
      }

      final typedName = _nameController.text.trim();
      final customerName = typedName.isNotEmpty
          ? typedName
          : (user?.name ?? 'Guest');

      final menuItems = await restaurantService
          .getMenuItems(widget.restaurant.id)
          .first;
      final orderItems = widget.cartItems.entries.map((entry) {
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
        return OrderItem(
          id: menuItem.id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: entry.value,
        );
      }).toList();

      // The server re-prices the cart and stores the order; guests pay cash on
      // delivery because every other method needs a signed-in customer.
      final order = await orderService.createOrder(
        items: orderItems,
        deliveryAddress: _addressController.text.trim(),
        phone: phone,
        name: customerName,
        paymentMethod: _paymentMethod,
        quotedTotal: quote.total,
        deliveryLat: user?.lat,
        deliveryLng: user?.lng,
      );

      // Driver dispatch is order-based: the server exposes the stored order to
      // eligible drivers, who claim it through POST /api/orders/:id/accept.
      // (The previous NestJS createDelivery() call posted to /api/deliveries,
      // which this server does not implement, so it was a silent no-op.)

      PesaPalCheckout? checkout;
      if (_paymentMethod == 'pesapal') {
        final session = await paymentService.initiatePesaPalCheckout(
          orderId: order.id,
          idToken: idToken!,
        );
        final opened = await launchUrl(
          Uri.parse(session.redirectUrl),
          mode: LaunchMode.externalApplication,
        );
        if (!opened) {
          throw Exception('Could not open the PesaPal checkout page');
        }
        checkout = session;
      }

      // Log order_placed event
      await analytics.logOrderPlaced(
        orderId: order.id,
        orderTotal: order.total,
        itemCount: orderItems.fold(0, (sum, item) => sum + item.quantity),
      );

      if (!mounted) return;

      if (checkout == null) {
        // The cart's contents are now an order: empty it, or the same items
        // are still sitting there the next time the cart opens and can be
        // ordered again by mistake.
        _finishWithCartCleared(
          'Order placed â€” ${AppConstants.formatPrice(order.total)} to pay on '
          'delivery',
        );
        return;
      }

      // A typed non-null copy: promotion of `checkout` does not survive being
      // captured by the sheet builder below.
      final PesaPalCheckout placedCheckout = checkout;

      // The PesaPal checkout page is open in the browser. Watch its status
      // instead of assuming success, so the customer learns whether the
      // payment really went through.
      final outcome = await showModalBottomSheet<_PesapalOutcome>(
        context: context,
        isDismissible: false,
        enableDrag: false,
        builder: (_) => _PesapalStatusSheet(
          paymentService: paymentService,
          checkout: placedCheckout,
          idToken: idToken!,
        ),
      );
      if (!mounted) return;

      if (outcome == _PesapalOutcome.confirmed) {
        // The server settles the order/payment rows from PesaPal's IPN and
        // the status call above â€” the app never writes a paid status itself.
        // Read the settled order back so the app state matches the ledger.
        try {
          await context.read<OrderService>().getOrder(order.id);
        } catch (e) {
          AppLogger.warning('Could not refresh the paid order: $e');
        }
        if (mounted) {
          _finishWithCartCleared(
            'Payment confirmed âœ“ â€” ${AppConstants.formatPrice(order.total)} '
            'received, your order is on its way',
          );
        }
      } else if (outcome == _PesapalOutcome.notConfirmed) {
        _finishWithCartCleared(
          'Payment incomplete â€” try paying again, or choose cash on delivery '
          'next time. Orders left unpaid are cancelled automatically after '
          'about 2 hours',
        );
      } else if (outcome == _PesapalOutcome.abandoned) {
        _finishWithCartCleared(
          'You can finish the payment in the PesaPal page at any time â€” '
          'orders left unpaid are cancelled automatically after about 2 hours',
        );
      } else {
        // The sheet closed with no choice (e.g. the system back button) while
        // the payment may still be in flight: keep the order and the cart, or
        // a possibly-paid order would be silently dropped.
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text(
              'Order placed â€” the payment still needs confirming in PesaPal; '
              'orders left unpaid are cancelled automatically after about '
              '2 hours',
            ),
          ),
        );
      }
    } catch (e) {
      _showMessage('Error: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  /// Empties the cart, shows [message] and returns to the app's first screen.
  ///
  /// The cart's contents are now an order: emptying it stops the same items
  /// being ordered again by mistake. Only called once the payment outcome is
  /// known or the customer explicitly chose to continue.
  void _finishWithCartCleared(String message) {
    context.read<CartService>().clearCart();
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
    Navigator.of(context).popUntil((route) => route.isFirst);
  }

  Widget _summaryRow(String label, String value, {bool emphasised = false}) {
    final style = emphasised
        ? const TextStyle(fontWeight: FontWeight.bold)
        : null;
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: style),
          Text(value, style: style),
        ],
      ),
    );
  }

  Widget _buildQuoteSection() {
    if (_quoteLoading) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Center(child: CircularProgressIndicator()),
      );
    }

    final quote = _quote;
    if (quote == null) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Could not price this cart: ${_quoteError ?? 'unknown error'}',
            ),
            TextButton(onPressed: _loadQuote, child: const Text('Retry')),
          ],
        ),
      );
    }

    return Column(
      children: [
        _summaryRow('Subtotal', AppConstants.formatPrice(quote.subtotal)),
        if (quote.discount > 0)
          _summaryRow(
            'Discount',
            '-${AppConstants.formatPrice(quote.discount)}',
          ),
        _summaryRow(
          'Delivery Fee',
          AppConstants.formatPrice(quote.deliveryFee),
        ),
        if (quote.tax > 0)
          _summaryRow('Tax', AppConstants.formatPrice(quote.tax)),
        const Divider(),
        _summaryRow(
          'Total',
          AppConstants.formatPrice(quote.total),
          emphasised: true,
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final restaurantService = context.read<RestaurantService>();

    return Scaffold(
      appBar: AppBar(title: const Text('Cart')),
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
              child: SingleChildScrollView(
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
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: _nameController,
                            decoration: const InputDecoration(
                              labelText: 'Name',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextField(
                            controller: _phoneController,
                            keyboardType: TextInputType.phone,
                            decoration: const InputDecoration(
                              labelText: 'Phone',
                              hintText: '0712 345 678',
                              border: OutlineInputBorder(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    _buildQuoteSection(),
                    const SizedBox(height: 8),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Payment',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    RadioListTile<String>(
                      value: 'cod',
                      groupValue: _paymentMethod,
                      onChanged: _isLoading
                          ? null
                          : (value) =>
                                setState(() => _paymentMethod = value ?? 'cod'),
                      title: const Text('Cash on Delivery'),
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                    ),
                    RadioListTile<String>(
                      value: 'pesapal',
                      groupValue: _paymentMethod,
                      onChanged: _isLoading
                          ? null
                          : (value) =>
                                setState(() => _paymentMethod = value ?? 'cod'),
                      title: const Text('Pay Online (PesaPal)'),
                      subtitle: const Text('Sign-in required'),
                      contentPadding: EdgeInsets.zero,
                      dense: true,
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: (_isLoading || _quote == null)
                            ? null
                            : _placeOrder,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF064E3B),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 16),
                        ),
                        child: _isLoading
                            ? const CircularProgressIndicator(
                                color: Colors.white,
                              )
                            : const Text('Place Order'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

/// What the confirmation sheet decided about a PesaPal payment.
enum _PesapalOutcome {
  /// PesaPal reported the transaction as completed.
  confirmed,

  /// PesaPal reported a failure/reversal, or the poll ran out of time and the
  /// customer chose to continue without a confirmation.
  notConfirmed,

  /// The customer closed the sheet while the transaction was still pending.
  abandoned,
}

enum _PollPhase { waiting, confirmed, incomplete }

/// Polls the server for the state of the PesaPal transaction opened in the
/// browser and keeps the customer informed while waiting.
///
/// The app never writes a payment result: the server settles the order and
/// payment rows from PesaPal's IPN, and this sheet only reads
/// `GET /api/payments/pesapal/status/:orderTrackingId` every few seconds
/// (status code 1 completed, 2 failed, 3 reversed). It pops with a
/// [_PesapalOutcome] once the transaction resolves or the customer picks an
/// exit â€” it never closes on its own.
class _PesapalStatusSheet extends StatefulWidget {
  final PaymentService paymentService;
  final PesaPalCheckout checkout;
  final String idToken;

  const _PesapalStatusSheet({
    required this.paymentService,
    required this.checkout,
    required this.idToken,
  });

  @override
  State<_PesapalStatusSheet> createState() => _PesapalStatusSheetState();
}

class _PesapalStatusSheetState extends State<_PesapalStatusSheet> {
  static const _pollInterval = Duration(seconds: 5);
  static const _pollLimit = Duration(minutes: 3);

  Timer? _timer;
  DateTime _deadline = DateTime.now().add(_pollLimit);
  _PollPhase _phase = _PollPhase.waiting;
  String _outcomeDetail = '';
  bool _polling = false;

  @override
  void initState() {
    super.initState();
    _poll(); // Check right away â€” some payments confirm within seconds.
    _timer = Timer.periodic(_pollInterval, (_) => _poll());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _poll() async {
    if (!mounted || _phase != _PollPhase.waiting || _polling) return;
    _polling = true;
    try {
      final status = await widget.paymentService.getPesapalStatus(
        orderTrackingId: widget.checkout.orderTrackingId,
        idToken: widget.idToken,
      );
      if (!mounted) return;
      if (status.isCompleted) {
        _timer?.cancel();
        setState(() => _phase = _PollPhase.confirmed);
        // Let the customer see the confirmation before the sheet closes.
        await Future<void>.delayed(const Duration(milliseconds: 1500));
        if (mounted) Navigator.of(context).pop(_PesapalOutcome.confirmed);
      } else if (status.hasFailed) {
        _timer?.cancel();
        setState(() {
          _phase = _PollPhase.incomplete;
          _outcomeDetail = status.description.isEmpty
              ? 'The payment was declined or reversed.'
              : status.description;
        });
      } else if (DateTime.now().isAfter(_deadline)) {
        _timer?.cancel();
        setState(() {
          _phase = _PollPhase.incomplete;
          _outcomeDetail = 'No confirmation has arrived yet.';
        });
      }
    } catch (e) {
      AppLogger.warning('PesaPal status poll failed: $e');
      // Transient network/API trouble â€” keep polling until the deadline.
      if (!mounted) return;
      if (DateTime.now().isAfter(_deadline)) {
        _timer?.cancel();
        setState(() {
          _phase = _PollPhase.incomplete;
          _outcomeDetail = 'The payment could not be checked.';
        });
      }
    } finally {
      _polling = false;
    }
  }

  Future<void> _retryInBrowser() async {
    try {
      final opened = await launchUrl(
        Uri.parse(widget.checkout.redirectUrl),
        mode: LaunchMode.externalApplication,
      );
      if (!mounted) return;
      if (!opened) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Could not open the PesaPal checkout page'),
          ),
        );
        return;
      }
      // A fresh visit means a fresh wait; the same transaction is re-checked.
      setState(() {
        _phase = _PollPhase.waiting;
        _outcomeDetail = '';
        _deadline = DateTime.now().add(_pollLimit);
      });
      _poll();
    } catch (e) {
      AppLogger.warning('Could not reopen PesaPal checkout: $e');
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open the PesaPal checkout page: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            if (_phase == _PollPhase.waiting)
              ..._confirmingBody()
            else if (_phase == _PollPhase.confirmed)
              ..._confirmedBody()
            else
              ..._incompleteBody(),
          ],
        ),
      ),
    );
  }

  List<Widget> _confirmingBody() => [
    const SizedBox(height: 8),
    const Center(
      child: SizedBox(
        width: 48,
        height: 48,
        child: CircularProgressIndicator(),
      ),
    ),
    const SizedBox(height: 16),
    const Text(
      'Confirming paymentâ€¦',
      textAlign: TextAlign.center,
      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
    ),
    const SizedBox(height: 8),
    Text(
      'Watching the PesaPal page that just opened (reference '
      '${widget.checkout.merchantReference}). Finish the payment there '
      'and this updates by itself.',
      textAlign: TextAlign.center,
    ),
    const SizedBox(height: 8),
    TextButton(
      onPressed: () => Navigator.of(context).pop(_PesapalOutcome.abandoned),
      child: const Text('Continue without waiting'),
    ),
  ];

  List<Widget> _confirmedBody() => const [
    SizedBox(height: 8),
    Icon(Icons.check_circle, color: Colors.green, size: 48),
    SizedBox(height: 16),
    Text(
      'Payment confirmed âœ“',
      textAlign: TextAlign.center,
      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
    ),
    SizedBox(height: 8),
    Text('Your order has been paid. Thank you!', textAlign: TextAlign.center),
  ];

  List<Widget> _incompleteBody() => [
    const SizedBox(height: 8),
    const Icon(Icons.error_outline, color: Colors.orange, size: 48),
    const SizedBox(height: 16),
    const Text(
      'Payment incomplete',
      textAlign: TextAlign.center,
      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
    ),
    const SizedBox(height: 8),
    Text(
      '$_outcomeDetail If you did not finish paying, try again below. '
      'An order left unpaid is cancelled automatically after about '
      '2 hours.',
      textAlign: TextAlign.center,
    ),
    const SizedBox(height: 16),
    OutlinedButton(
      onPressed: _retryInBrowser,
      child: const Text('Try paying again'),
    ),
    TextButton(
      onPressed: () => Navigator.of(context).pop(_PesapalOutcome.notConfirmed),
      child: const Text('Continue'),
    ),
  ];
}
