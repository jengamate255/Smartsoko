import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:smartsoko/models/order.dart' as models;
import 'package:smartsoko/config/app_config.dart';
import 'package:smartsoko/utils/uuid_utils.dart';
import 'supabase_service.dart';

/// Prices for a cart, quoted by the API server.
///
/// The server owns the catalog prices, delivery fee and tax (see
/// `server/src/services/checkout.js`), so the totals shown before ordering are
/// the totals actually stored on the order.
class OrderQuote {
  final double subtotal;
  final double deliveryFee;
  final double tax;
  final double discount;
  final double total;
  final String currency;

  const OrderQuote({
    required this.subtotal,
    required this.deliveryFee,
    required this.tax,
    required this.discount,
    required this.total,
    required this.currency,
  });

  factory OrderQuote.fromMap(Map<String, dynamic> data) {
    double amount(Object? value) => (value as num?)?.toDouble() ?? 0;
    return OrderQuote(
      subtotal: amount(data['subtotal']),
      deliveryFee: amount(data['deliveryFee']),
      tax: amount(data['taxAmount']),
      discount: amount(data['discount']),
      total: amount(data['total']),
      currency: data['currency']?.toString() ?? 'TZS',
    );
  }
}

/// Order data, backed by Supabase.
///
/// The app runs in Supabase-only mode, so these queries read from Supabase
/// directly rather than trying Firestore first and falling back.
///
/// The stream accessors are backed by one-shot fetches rather than Supabase
/// Realtime: the tables are not in the `supabase_realtime` publication, so a
/// realtime subscription would never emit.
///
/// Order *creation* is the exception â€” it goes through the API server, because
/// the `orders` RLS policies only let a signed-in customer insert its own row
/// (`customer_id = auth.uid()`), which a guest or demo session never satisfies.
/// Status and rider updates go through the server for the same reason: the
/// policies reject an anon-key write with HTTP 401, so they pass a Firebase ID
/// token and let the server enforce tenancy.
class OrderService {
  final SupabaseService _supabaseService = SupabaseService();

  SupabaseClient get _client => _supabaseService.client;

  /// Prices the cart without creating an order. Guests are allowed.
  Future<OrderQuote> quoteOrder({
    required Map<String, int> itemQuantities,
    String? promoCode,
  }) async {
    final body = await _post('/orders/quote', {
      'items': _cartPayload(itemQuantities),
      if (promoCode != null && promoCode.isNotEmpty) 'promoCode': promoCode,
    });

    final quote = body['quote'];
    if (quote is! Map) throw Exception('The server did not return a quote');
    return OrderQuote.fromMap(quote.cast<String, dynamic>());
  }

  /// Places an order through the API server and returns the stored order.
  ///
  /// The server re-prices every line from the database, so [quotedTotal] is only
  /// a guard: if it no longer matches, the server rejects the order with
  /// "Prices changed" (HTTP 409) instead of charging an unexpected amount.
  ///
  /// Guests may only use `cod`; the server refuses other methods without a
  /// session ("Sign in to pay online"). The owning restaurant is derived from
  /// the cart items, so it is not passed here.
  Future<models.Order> createOrder({
    required List<models.OrderItem> items,
    required String deliveryAddress,
    required String phone,
    String? name,
    String paymentMethod = 'cod',
    double? quotedTotal,
    String? promoCode,
    double? deliveryLat,
    double? deliveryLng,
  }) async {
    final body = await _post('/orders', {
      'items': items.map((e) => {'id': e.id, 'quantity': e.quantity}).toList(),
      'deliveryAddress': deliveryAddress,
      'phone': phone,
      if (name != null && name.isNotEmpty) 'name': name,
      if (deliveryLat != null) 'deliveryLat': deliveryLat,
      if (deliveryLng != null) 'deliveryLng': deliveryLng,
      'paymentMethod': paymentMethod,
      if (quotedTotal != null) 'quotedTotal': quotedTotal.round(),
      if (promoCode != null && promoCode.isNotEmpty) 'promoCode': promoCode,
    });

    final order = body['order'];
    if (order is! Map) throw Exception('The server did not return an order');
    return models.Order.fromMap(order.cast<String, dynamic>());
  }

  /// Moves an order along the merchant lifecycle
  /// (`POST /api/merchant/orders/:orderId/status`).
  ///
  /// The `orders` policies only accept a write from the owning session, so the
  /// anon key got HTTP 401. The server holds the service key and enforces
  /// tenancy: the caller must resolve to the order's restaurant, and the
  /// transition must be legal for the current status.
  Future<void> updateOrderStatus(
    String orderId,
    models.OrderStatus status, {
    required String idToken,
  }) async {
    await _post('/merchant/orders/$orderId/status', {
      'status': status.apiValue,
    }, idToken: idToken);
  }

  /// Driver hand-off writes (`POST /api/orders/:orderId/status`). The server
  /// binds the write to the calling driver and credits their wallet when the
  /// order is delivered.
  Future<void> updateDriverOrderStatus(
    String orderId,
    models.OrderStatus status, {
    required String idToken,
  }) async {
    await _post('/orders/$orderId/status', {
      'status': status.apiValue,
    }, idToken: idToken);
  }

  /// Claims an unassigned order for the calling driver
  /// (`POST /api/orders/:orderId/accept`).
  ///
  /// The driver is taken from the verified token rather than from an argument,
  /// so this replaces the old anon-key `driver_id` write.
  Future<void> acceptOrder(String orderId, {required String idToken}) async {
    await _post('/orders/$orderId/accept', const {}, idToken: idToken);
  }

  Stream<List<models.Order>> getUserOrders(String userId) {
    // `customer_id` is a uuid; a Firebase uid would make PostgREST fail with
    // 22P02 rather than return no orders.
    if (!isUuid(userId)) return Stream.value(const []);
    return Stream.fromFuture(_fetchOrders(customerId: userId));
  }

  Stream<List<models.Order>> getRiderOrders(String riderId) {
    if (riderId.isEmpty) return Stream.value(const []);
    return Stream.fromFuture(_fetchOrders(driverId: riderId));
  }

  Stream<List<models.Order>> getPendingOrders() {
    return Stream.fromFuture(
      _fetchOrders(status: models.OrderStatus.pending.name, ascending: true),
    );
  }

  Stream<List<models.Order>> getAllOrders() =>
      Stream.fromFuture(_fetchOrders());

  Stream<List<models.Order>> getRestaurantOrders(String restaurantId) =>
      Stream.fromFuture(_fetchOrders(restaurantId: restaurantId));

  Future<List<models.Order>> _fetchOrders({
    String? customerId,
    String? driverId,
    String? restaurantId,
    String? status,
    bool ascending = false,
  }) async {
    var query = _client.from('orders').select();
    if (customerId != null) query = query.eq('customer_id', customerId);
    if (driverId != null) query = query.eq('driver_id', driverId);
    if (restaurantId != null) query = query.eq('restaurant_id', restaurantId);
    if (status != null) query = query.eq('status', status);
    final rows = await query.order('created_at', ascending: ascending);
    return rows.map(models.Order.fromMap).toList();
  }

  Future<models.Order?> getOrder(String orderId) async {
    final row = await _client
        .from('orders')
        .select()
        .eq('id', orderId)
        .maybeSingle();
    if (row == null) return null;
    return models.Order.fromMap(row);
  }

  Stream<models.Order?> getOrderStream(String orderId) {
    return Stream.fromFuture(_fetchOrder(orderId));
  }

  Future<models.Order?> _fetchOrder(String orderId) async {
    final row = await _client
        .from('orders')
        .select()
        .eq('id', orderId)
        .maybeSingle();
    if (row == null) return null;
    return models.Order.fromMap(row);
  }

  List<Map<String, dynamic>> _cartPayload(Map<String, int> itemQuantities) =>
      itemQuantities.entries
          .map((entry) => {'id': entry.key, 'quantity': entry.value})
          .toList();

  /// POSTs [payload] to [path] and returns the decoded body, turning any
  /// non-2xx response into an exception carrying the server's message.
  ///
  /// [idToken] is attached as a bearer token for the endpoints that act as the
  /// signed-in user; the server then resolves the merchant/driver itself.
  Future<Map<String, dynamic>> _post(
    String path,
    Map<String, dynamic> payload, {
    String? idToken,
  }) async {
    final headers = <String, String>{'Content-Type': 'application/json'};
    if (idToken != null && idToken.isNotEmpty) {
      headers['Authorization'] = 'Bearer $idToken';
    }

    final response = await http.post(
      Uri.parse('${AppConfig.apiBaseUrl}$path'),
      headers: headers,
      body: jsonEncode(payload),
    );

    Map<String, dynamic>? body;
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map) body = decoded.cast<String, dynamic>();
    } catch (_) {
      body = null;
    }

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(
        body?['error'] ?? 'Request failed (HTTP ${response.statusCode})',
      );
    }
    if (body == null) throw Exception('Malformed response from the server');
    return body;
  }
}
