import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/shop.dart';
import 'dart:math';

class ShopService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // Get all shops
  Stream<List<Shop>> getShops() {
    return _firestore
        .collection('shops')
        .orderBy('rating', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Shop.fromFirestore(doc)).toList());
  }

  // Get shops by type
  Stream<List<Shop>> getShopsByType(ShopType type) {
    return _firestore
        .collection('shops')
        .where('type', isEqualTo: type.name)
        .where('isOpen', isEqualTo: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Shop.fromFirestore(doc)).toList());
  }

  // Get shops by category
  Stream<List<Shop>> getShopsByCategory(String category) {
    return _firestore
        .collection('shops')
        .where('category', isEqualTo: category)
        .where('isOpen', isEqualTo: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Shop.fromFirestore(doc)).toList());
  }

  // Get shop by ID
  Future<Shop?> getShopById(String shopId) async {
    final doc = await _firestore.collection('shops').doc(shopId).get();
    if (doc.exists) {
      return Shop.fromFirestore(doc);
    }
    return null;
  }

  // Get shop by owner ID
  Future<Shop?> getShopByOwnerId(String ownerId) async {
    final querySnapshot = await _firestore
        .collection('shops')
        .where('ownerId', isEqualTo: ownerId)
        .limit(1)
        .get();
    
    if (querySnapshot.docs.isNotEmpty) {
      return Shop.fromFirestore(querySnapshot.docs.first);
    }
    return null;
  }

  // Create a new shop
  Future<String> createShop(Shop shop) async {
    final docRef = await _firestore.collection('shops').add(shop.toFirestore());
    return docRef.id;
  }

  // Update a shop
  Future<void> updateShop(String shopId, Shop shop) async {
    await _firestore.collection('shops').doc(shopId).update(shop.toFirestore());
  }

  // Toggle shop open status
  Future<void> toggleShopOpen(String shopId, bool isOpen) async {
    await _firestore
        .collection('shops')
        .doc(shopId)
        .update({'isOpen': isOpen, 'updatedAt': FieldValue.serverTimestamp()});
  }

  // Delete a shop
  Future<void> deleteShop(String shopId) async {
    await _firestore.collection('shops').doc(shopId).delete();
  }

  // Get products for a shop
  Stream<List<Product>> getShopProducts(String shopId) {
    return _firestore
        .collection('products')
        .where('shopId', isEqualTo: shopId)
        .where('isAvailable', isEqualTo: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Product.fromFirestore(doc)).toList());
  }

  // Add product to shop
  Future<String> addProduct(Product product) async {
    final docRef =
        await _firestore.collection('products').add(product.toFirestore());
    return docRef.id;
  }

  // Update product
  Future<void> updateProduct(String productId, Product product) async {
    await _firestore
        .collection('products')
        .doc(productId)
        .update(product.toFirestore());
  }

  // Delete product
  Future<void> deleteProduct(String productId) async {
    await _firestore.collection('products').doc(productId).delete();
  }

  // Update product stock
  Future<void> updateProductStock(String productId, int quantity) async {
    await _firestore
        .collection('products')
        .doc(productId)
        .update({'stockQuantity': quantity, 'updatedAt': FieldValue.serverTimestamp()});
  }

  // Create shop order
  Future<String> createShopOrder(ShopOrder order) async {
    final docRef =
        await _firestore.collection('shop_orders').add(order.toFirestore());
    return docRef.id;
  }

  // Get shop orders for a user
  Stream<List<ShopOrder>> getUserShopOrders(String userId) {
    return _firestore
        .collection('shop_orders')
        .where('userId', isEqualTo: userId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => ShopOrder.fromFirestore(doc)).toList());
  }

  // Get shop orders for a shop
  Stream<List<ShopOrder>> getShopOrders(String shopId) {
    return _firestore
        .collection('shop_orders')
        .where('shopId', isEqualTo: shopId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => ShopOrder.fromFirestore(doc)).toList());
  }

  // Update shop order status
  Future<void> updateShopOrderStatus(String orderId, String status) async {
    await _firestore.collection('shop_orders').doc(orderId).update({
      'status': status,
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Assign rider to shop order
  Future<void> assignRiderToShopOrder(String orderId, String riderId) async {
    await _firestore.collection('shop_orders').doc(orderId).update({
      'riderId': riderId,
      'status': 'pickedUp',
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Mark shop order as delivered
  Future<void> markShopOrderDelivered(String orderId) async {
    await _firestore.collection('shop_orders').doc(orderId).update({
      'status': 'delivered',
      'deliveredAt': FieldValue.serverTimestamp(),
      'updatedAt': FieldValue.serverTimestamp(),
    });
  }

  // Search shops by name
  Future<List<Shop>> searchShops(String query) async {
    final querySnapshot = await _firestore
        .collection('shops')
        .where('name', isGreaterThanOrEqualTo: query)
        .where('name', isLessThanOrEqualTo: '$query\uf8ff')
        .get();

    return querySnapshot.docs.map((doc) => Shop.fromFirestore(doc)).toList();
  }

  // Search products by name
  Future<List<Product>> searchProducts(String query) async {
    final querySnapshot = await _firestore
        .collection('products')
        .where('name', isGreaterThanOrEqualTo: query)
        .where('name', isLessThanOrEqualTo: '$query\uf8ff')
        .get();

    return querySnapshot.docs.map((doc) => Product.fromFirestore(doc)).toList();
  }

  // Get featured shops (highest rated)
  Stream<List<Shop>> getFeaturedShops() {
    return _firestore
        .collection('shops')
        .where('isOpen', isEqualTo: true)
        .where('isVerified', isEqualTo: true)
        .orderBy('rating', descending: true)
        .limit(10)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Shop.fromFirestore(doc)).toList());
  }

  // Get nearby shops (simplified - in production you'd use geohashing)
  Future<List<Shop>> getNearbyShops(double lat, double lng, double radiusKm) async {
    // This is a simplified version - for production, use geohashing
    final querySnapshot = await _firestore
        .collection('shops')
        .where('isOpen', isEqualTo: true)
        .get();

    return querySnapshot.docs
        .map((doc) => Shop.fromFirestore(doc))
        .where((shop) {
      final distance = _calculateDistance(lat, lng, shop.lat, shop.lng);
      return distance <= radiusKm;
    }).toList();
  }

  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const double earthRadius = 6371; // km
    final dLat = _degreesToRadians(lat2 - lat1);
    final dLon = _degreesToRadians(lon2 - lon1);
    final a = (dLat / 2) * (dLat / 2) +
        (lon1 * 3.14159265359 / 180) *
            (lon2 * 3.14159265359 / 180) *
            (dLon / 2) *
            (dLon / 2);
    final c = 2 * (a > 1 ? 1 : (a < 0 ? 0 : a)).toDouble();
    return earthRadius * 2 * asin(sqrt(c));
  }

  double _degreesToRadians(double degrees) {
    return degrees * 3.14159265359 / 180;
  }
}
