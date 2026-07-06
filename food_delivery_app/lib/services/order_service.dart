import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/order.dart' as models;
import '../config/app_config.dart';
import 'supabase_service.dart';
import '../utils/logger.dart';

class OrderService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final SupabaseService _supabaseService = SupabaseService();

  CollectionReference get _orders => _firestore.collection(AppConfig.ordersCollection);

  Future<models.Order> createOrder({
    required String userId,
    required String restaurantId,
    required List<models.OrderItem> items,
    required double subtotal,
    required double deliveryFee,
    required double total,
    required String deliveryAddress,
    double? deliveryLat,
    double? deliveryLng,
    String? riderNotes,
  }) async {
    final order = models.Order(
      id: '',
      userId: userId,
      restaurantId: restaurantId,
      items: items,
      subtotal: subtotal,
      deliveryFee: deliveryFee,
      total: total,
      status: models.OrderStatus.pending,
      paymentStatus: models.PaymentStatus.pending,
      deliveryAddress: deliveryAddress,
      deliveryLat: deliveryLat,
      deliveryLng: deliveryLng,
      riderNotes: riderNotes,
      createdAt: DateTime.now(),
    );

    final docRef = await _orders.add(order.toFirestore());
    final doc = await docRef.get();
    return models.Order.fromFirestore(doc);
  }

  Future<void> updateOrderStatus(String orderId, models.OrderStatus status) async {
    await _orders.doc(orderId).update({
      'status': status.name,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> assignRider(String orderId, String riderId) async {
    await _orders.doc(orderId).update({
      'riderId': riderId,
      'status': models.OrderStatus.confirmed.name,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  Future<void> updatePaymentStatus(String orderId, models.PaymentStatus status, {String? paymentId}) async {
    final updates = <String, dynamic>{
      'paymentStatus': status.name,
      'updatedAt': FieldValue.serverTimestamp(),
    };
    if (paymentId != null) {
      updates['paymentId'] = paymentId;
    }
    await _orders.doc(orderId).update(updates);
  }

  Stream<List<models.Order>> getUserOrders(String userId) {
    return _orders
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => models.Order.fromFirestore(doc)).toList())
        .handleError((error) async* {
          AppLogger.warning('Firebase failed, falling back to Supabase for orders: $error');
          final supabaseData = await _supabaseService.client
              .from('orders')
              .select()
              .eq('customer_id', userId); // Note: assuming userId is compatible or mapped
          
          yield (supabaseData as List).map((data) => models.Order.fromMap(data)).toList();
        });
  }

  Stream<List<models.Order>> getRiderOrders(String riderId) {
    return _orders
        .where('riderId', isEqualTo: riderId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => models.Order.fromFirestore(doc)).toList());
  }

  Stream<List<models.Order>> getPendingOrders() {
    return _orders
        .where('status', isEqualTo: models.OrderStatus.pending.name)
        .orderBy('createdAt', descending: false)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => models.Order.fromFirestore(doc)).toList());
  }

  Stream<List<models.Order>> getAllOrders() {
    return _orders
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => models.Order.fromFirestore(doc)).toList());
  }

  Future<models.Order?> getOrder(String orderId) async {
    final doc = await _orders.doc(orderId).get();
    if (!doc.exists) return null;
    return models.Order.fromFirestore(doc);
  }

  Stream<models.Order?> getOrderStream(String orderId) {
    return _orders.doc(orderId).snapshots().map((doc) {
      if (!doc.exists) return null;
      return models.Order.fromFirestore(doc);
    });
  }

  Stream<List<models.Order>> getRestaurantOrders(String restaurantId) {
    return _orders
        .where('restaurantId', isEqualTo: restaurantId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => models.Order.fromFirestore(doc)).toList());
  }
}
