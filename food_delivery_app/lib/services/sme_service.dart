import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/sme_models.dart';
import '../models/shop.dart';

class SMEService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  // ==================== STAFF ====================

  Stream<List<Staff>> getShopStaff(String shopId) {
    return _firestore
        .collection('staff')
        .where('shopId', isEqualTo: shopId)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Staff.fromFirestore(doc)).toList());
  }

  Future<String> addStaff(Staff staff) async {
    final docRef = await _firestore.collection('staff').add(staff.toFirestore());
    return docRef.id;
  }

  Future<void> updateStaff(String staffId, Staff staff) async {
    await _firestore.collection('staff').doc(staffId).update(staff.toFirestore());
  }

  Future<void> deactivateStaff(String staffId) async {
    await _firestore.collection('staff').doc(staffId).update({
      'isActive': false,
    });
  }

  Future<void> deleteStaff(String staffId) async {
    await _firestore.collection('staff').doc(staffId).delete();
  }

  // ==================== BRANCHES ====================

  Stream<List<Branch>> getShopBranches(String shopId) {
    return _firestore
        .collection('branches')
        .where('shopId', isEqualTo: shopId)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Branch.fromFirestore(doc)).toList());
  }

  Future<Branch> getBranch(String branchId) async {
    final doc = await _firestore.collection('branches').doc(branchId).get();
    return Branch.fromFirestore(doc);
  }

  Future<String> addBranch(Branch branch) async {
    final docRef = await _firestore.collection('branches').add(branch.toFirestore());
    return docRef.id;
  }

  Future<void> updateBranch(String branchId, Branch branch) async {
    await _firestore.collection('branches').doc(branchId).update(branch.toFirestore());
  }

  Future<void> toggleBranchActive(String branchId, bool isActive) async {
    await _firestore.collection('branches').doc(branchId).update({
      'isActive': isActive,
    });
  }

  Future<void> deleteBranch(String branchId) async {
    await _firestore.collection('branches').doc(branchId).delete();
  }

  // ==================== PROMOTIONS ====================

  Stream<List<Promotion>> getShopPromotions(String shopId) {
    return _firestore
        .collection('promotions')
        .where('shopId', isEqualTo: shopId)
        .orderBy('startDate', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Promotion.fromFirestore(doc)).toList());
  }

  Future<String> addPromotion(Promotion promotion) async {
    final docRef = await _firestore.collection('promotions').add(promotion.toFirestore());
    return docRef.id;
  }

  Future<void> updatePromotion(String promotionId, Promotion promotion) async {
    await _firestore.collection('promotions').doc(promotionId).update(promotion.toFirestore());
  }

  Future<void> togglePromotion(String promotionId, bool isActive) async {
    await _firestore.collection('promotions').doc(promotionId).update({
      'isActive': isActive,
    });
  }

  Future<void> incrementPromotionUsage(String promotionId) async {
    await _firestore.collection('promotions').doc(promotionId).update({
      'usageCount': FieldValue.increment(1),
    });
  }

  Future<void> deletePromotion(String promotionId) async {
    await _firestore.collection('promotions').doc(promotionId).delete();
  }

  Stream<List<Promotion>> getActivePromotions(String shopId) {
    final now = DateTime.now();
    return _firestore
        .collection('promotions')
        .where('shopId', isEqualTo: shopId)
        .where('isActive', isEqualTo: true)
        .where('startDate', isLessThanOrEqualTo: now)
        .where('endDate', isGreaterThanOrEqualTo: now)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Promotion.fromFirestore(doc)).toList());
  }

  // ==================== INVOICES ====================

  Stream<List<Invoice>> getShopInvoices(String shopId) {
    return _firestore
        .collection('invoices')
        .where('shopId', isEqualTo: shopId)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Invoice.fromFirestore(doc)).toList());
  }

  Future<Invoice> getInvoice(String invoiceId) async {
    final doc = await _firestore.collection('invoices').doc(invoiceId).get();
    return Invoice.fromFirestore(doc);
  }

  Future<String> createInvoice(Invoice invoice) async {
    final docRef = await _firestore.collection('invoices').add(invoice.toFirestore());
    return docRef.id;
  }

  Future<void> updateInvoiceStatus(String invoiceId, String status) async {
    await _firestore.collection('invoices').doc(invoiceId).update({
      'paymentStatus': status,
    });
  }

  Future<void> deleteInvoice(String invoiceId) async {
    await _firestore.collection('invoices').doc(invoiceId).delete();
  }

  Stream<List<Invoice>> getInvoicesByDateRange(String shopId, DateTime start, DateTime end) {
    return _firestore
        .collection('invoices')
        .where('shopId', isEqualTo: shopId)
        .where('createdAt', isGreaterThanOrEqualTo: start)
        .where('createdAt', isLessThanOrEqualTo: end)
        .orderBy('createdAt', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => Invoice.fromFirestore(doc)).toList());
  }

  // ==================== STOCK HISTORY ====================

  Stream<List<StockHistory>> getProductStockHistory(String shopId, String productId) {
    return _firestore
        .collection('stock_history')
        .where('shopId', isEqualTo: shopId)
        .where('productId', isEqualTo: productId)
        .orderBy('createdAt', descending: true)
        .limit(50)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => StockHistory.fromFirestore(doc)).toList());
  }

  Stream<List<StockHistory>> getShopStockHistory(String shopId) {
    return _firestore
        .collection('stock_history')
        .where('shopId', isEqualTo: shopId)
        .orderBy('createdAt', descending: true)
        .limit(100)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => StockHistory.fromFirestore(doc)).toList());
  }

  Future<void> recordStockChange({
    required String shopId,
    required String productId,
    required String productName,
    required int quantityChange,
    required int previousStock,
    required int newStock,
    required StockChangeType type,
    String? notes,
    String? staffId,
    String? staffName,
  }) async {
    final history = StockHistory(
      id: '',
      shopId: shopId,
      productId: productId,
      productName: productName,
      quantityChange: quantityChange,
      previousStock: previousStock,
      newStock: newStock,
      type: type,
      notes: notes,
      staffId: staffId,
      staffName: staffName,
      createdAt: DateTime.now(),
    );
    await _firestore.collection('stock_history').add(history.toFirestore());
  }

  // ==================== CUSTOMER CRM ====================

  Stream<List<CustomerProfile>> getShopCustomers(String shopId) {
    return _firestore
        .collection('customer_profiles')
        .where('visitedShopIds', arrayContains: shopId)
        .orderBy('totalSpent', descending: true)
        .snapshots()
        .map((snapshot) =>
            snapshot.docs.map((doc) => CustomerProfile.fromFirestore(doc)).toList());
  }

  Future<CustomerProfile?> getCustomerProfile(String customerId) async {
    final doc = await _firestore.collection('customer_profiles').doc(customerId).get();
    if (doc.exists) {
      return CustomerProfile.fromFirestore(doc);
    }
    return null;
  }

  Future<String> createCustomerProfile(CustomerProfile profile) async {
    final docRef = await _firestore.collection('customer_profiles').add(profile.toFirestore());
    return docRef.id;
  }

  Future<void> updateCustomerProfile(String customerId, CustomerProfile profile) async {
    await _firestore.collection('customer_profiles').doc(customerId).update(profile.toFirestore());
  }

  Future<void> addCustomerNote(String customerId, String note) async {
    await _firestore.collection('customer_profiles').doc(customerId).update({
      'notes': note,
      'updatedAt': Timestamp.fromDate(DateTime.now()),
    });
  }

  Future<void> addLoyaltyPoints(String customerId, int points) async {
    await _firestore.collection('customer_profiles').doc(customerId).update({
      'loyaltyPoints': FieldValue.increment(points),
    });
  }

  Future<void> redeemLoyaltyPoints(String customerId, int points) async {
    await _firestore.collection('customer_profiles').doc(customerId).update({
      'loyaltyPoints': FieldValue.increment(-points),
    });
  }

  // ==================== ANALYTICS ====================

  Future<Map<String, dynamic>> getShopAnalytics(String shopId, {int days = 30}) async {
    final now = DateTime.now();
    final startDate = now.subtract(Duration(days: days));

    // Get all shop orders
    final ordersSnapshot = await _firestore
        .collection('shop_orders')
        .where('shopId', isEqualTo: shopId)
        .where('createdAt', isGreaterThanOrEqualTo: startDate)
        .get();

    final orders = ordersSnapshot.docs
        .map((doc) => ShopOrder.fromFirestore(doc))
        .toList();

    // Get all products
    final productsSnapshot = await _firestore
        .collection('products')
        .where('shopId', isEqualTo: shopId)
        .get();

    final products = productsSnapshot.docs
        .map((doc) => Product.fromFirestore(doc))
        .toList();

    // Calculate metrics
    final totalRevenue = orders
        .where((o) => o.status == 'delivered')
        .fold<double>(0, (sum, order) => sum + order.total);

    final totalOrders = orders.length;
    final deliveredOrders = orders.where((o) => o.status == 'delivered').length;
    final pendingOrders = orders.where((o) => o.status == 'pending').length;
    final cancelledOrders = orders.where((o) => o.status == 'cancelled').length;

    final averageOrderValue = deliveredOrders > 0
        ? totalRevenue / deliveredOrders
        : 0.0;

    // Low stock products
    final lowStockProducts = products
        .where((p) => p.stockQuantity < 10 && p.isAvailable)
        .toList();

    // Today's stats
    final todayStart = DateTime(now.year, now.month, now.day);
    final todayOrders = orders.where((o) => o.createdAt.isAfter(todayStart)).toList();
    final todayRevenue = todayOrders
        .where((o) => o.status == 'delivered')
        .fold<double>(0, (sum, order) => sum + order.total);

    // Top products by order frequency
    final productFrequency = <String, int>{};
    for (final order in orders.where((o) => o.status == 'delivered')) {
      for (final item in order.items) {
        productFrequency[item.id] = (productFrequency[item.id] ?? 0) + item.quantity;
      }
    }

    final topProductIds = productFrequency.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));

    final topProducts = topProductIds.take(5).map((entry) {
      final product = products.firstWhere(
        (p) => p.id == entry.key,
        orElse: () => Product(
          id: entry.key,
          shopId: shopId,
          name: 'Unknown',
          description: '',
          price: 0,
          category: '',
          createdAt: DateTime.now(),
        ),
      );
      return {'product': product, 'quantity': entry.value};
    }).toList();

    // Daily revenue for chart
    final dailyRevenue = <Map<String, dynamic>>[];
    for (int i = days - 1; i >= 0; i--) {
      final dayStart = now.subtract(Duration(days: i));
      final dayEnd = dayStart.add(const Duration(days: 1));
      final dayOrders = orders.where((o) =>
          o.createdAt.isAfter(dayStart) &&
          o.createdAt.isBefore(dayEnd) &&
          o.status == 'delivered');
      final dayTotal = dayOrders.fold<double>(0, (sum, order) => sum + order.total);
      dailyRevenue.add({
        'date': dayStart,
        'revenue': dayTotal,
        'orders': dayOrders.length,
      });
    }

    return {
      'totalRevenue': totalRevenue,
      'totalOrders': totalOrders,
      'deliveredOrders': deliveredOrders,
      'pendingOrders': pendingOrders,
      'cancelledOrders': cancelledOrders,
      'averageOrderValue': averageOrderValue,
      'todayRevenue': todayRevenue,
      'todayOrders': todayOrders.length,
      'lowStockProducts': lowStockProducts,
      'topProducts': topProducts,
      'dailyRevenue': dailyRevenue,
      'totalProducts': products.length,
      'activeProducts': products.where((p) => p.isAvailable).length,
    };
  }

  // ==================== INVOICE GENERATION ====================

  Future<String> generateInvoiceFromOrder(ShopOrder order, {
    String? branchId,
    String? staffId,
    String? staffName,
    double taxRate = 0.18,
  }) async {
    final subtotal = order.subtotal;
    final taxAmount = subtotal * taxRate;
    final total = subtotal + taxAmount + order.deliveryFee;

    final invoiceItems = order.items.map((item) => InvoiceItem(
      productId: item.id,
      productName: item.name,
      unitPrice: item.price,
      quantity: item.quantity,
      discount: 0,
      total: item.price * item.quantity,
    )).toList();

    final invoice = Invoice(
      id: '',
      shopId: order.shopId,
      orderId: order.id,
      customerName: 'Customer',
      customerPhone: '',
      items: invoiceItems,
      subtotal: subtotal,
      taxAmount: taxAmount,
      discountAmount: 0,
      deliveryFee: order.deliveryFee,
      total: total,
      paymentMethod: 'cash',
      paymentStatus: 'pending',
      branchId: branchId,
      staffId: staffId,
      staffName: staffName,
      notes: order.customerNotes,
      createdAt: DateTime.now(),
    );

    return await createInvoice(invoice);
  }
}
