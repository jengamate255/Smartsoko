import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter/material.dart';

// ==================== STAFF MANAGEMENT ====================

enum StaffRole { owner, manager, cashier, delivery, staff }

extension StaffRoleExtension on StaffRole {
  String get displayName {
    switch (this) {
      case StaffRole.owner:
        return 'Owner';
      case StaffRole.manager:
        return 'Manager';
      case StaffRole.cashier:
        return 'Cashier';
      case StaffRole.delivery:
        return 'Delivery';
      case StaffRole.staff:
        return 'Staff';
    }
  }

  IconData get icon {
    switch (this) {
      case StaffRole.owner:
        return Icons.admin_panel_settings;
      case StaffRole.manager:
        return Icons.business_center;
      case StaffRole.cashier:
        return Icons.point_of_sale;
      case StaffRole.delivery:
        return Icons.delivery_dining;
      case StaffRole.staff:
        return Icons.person;
    }
  }
}

class Staff {
  final String id;
  final String shopId;
  final String name;
  final String phone;
  final StaffRole role;
  final String? email;
  final bool isActive;
  final DateTime joinedAt;
  final String? branchId;
  final Map<String, bool> permissions;

  Staff({
    required this.id,
    required this.shopId,
    required this.name,
    required this.phone,
    required this.role,
    this.email,
    this.isActive = true,
    required this.joinedAt,
    this.branchId,
    this.permissions = const {},
  });

  factory Staff.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Staff(
      id: doc.id,
      shopId: data['shopId'] ?? '',
      name: data['name'] ?? '',
      phone: data['phone'] ?? '',
      role: StaffRole.values.firstWhere(
        (e) => e.name == data['role'],
        orElse: () => StaffRole.staff,
      ),
      email: data['email'],
      isActive: data['isActive'] ?? true,
      joinedAt: (data['joinedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      branchId: data['branchId'],
      permissions: Map<String, bool>.from(data['permissions'] ?? {}),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'shopId': shopId,
      'name': name,
      'phone': phone,
      'role': role.name,
      'email': email,
      'isActive': isActive,
      'joinedAt': Timestamp.fromDate(joinedAt),
      'branchId': branchId,
      'permissions': permissions,
    };
  }

  Staff copyWith({
    String? name,
    String? phone,
    StaffRole? role,
    String? email,
    bool? isActive,
    String? branchId,
    Map<String, bool>? permissions,
  }) {
    return Staff(
      id: id,
      shopId: shopId,
      name: name ?? this.name,
      phone: phone ?? this.phone,
      role: role ?? this.role,
      email: email ?? this.email,
      isActive: isActive ?? this.isActive,
      joinedAt: joinedAt,
      branchId: branchId ?? this.branchId,
      permissions: permissions ?? this.permissions,
    );
  }
}

// ==================== BRANCH MANAGEMENT ====================

class Branch {
  final String id;
  final String shopId;
  final String name;
  final String address;
  final double lat;
  final double lng;
  final String? managerId;
  final String? managerName;
  final String? phone;
  final bool isActive;
  final Map<String, String>? operatingHours;
  final DateTime createdAt;

  Branch({
    required this.id,
    required this.shopId,
    required this.name,
    required this.address,
    required this.lat,
    required this.lng,
    this.managerId,
    this.managerName,
    this.phone,
    this.isActive = true,
    this.operatingHours,
    required this.createdAt,
  });

  factory Branch.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Branch(
      id: doc.id,
      shopId: data['shopId'] ?? '',
      name: data['name'] ?? '',
      address: data['address'] ?? '',
      lat: (data['lat'] ?? 0.0).toDouble(),
      lng: (data['lng'] ?? 0.0).toDouble(),
      managerId: data['managerId'],
      managerName: data['managerName'],
      phone: data['phone'],
      isActive: data['isActive'] ?? true,
      operatingHours: data['operatingHours'] != null
          ? Map<String, String>.from(data['operatingHours'])
          : null,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'shopId': shopId,
      'name': name,
      'address': address,
      'lat': lat,
      'lng': lng,
      'managerId': managerId,
      'managerName': managerName,
      'phone': phone,
      'isActive': isActive,
      'operatingHours': operatingHours,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  Branch copyWith({
    String? name,
    String? address,
    double? lat,
    double? lng,
    String? managerId,
    String? managerName,
    String? phone,
    bool? isActive,
    Map<String, String>? operatingHours,
  }) {
    return Branch(
      id: id,
      shopId: shopId,
      name: name ?? this.name,
      address: address ?? this.address,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      managerId: managerId ?? this.managerId,
      managerName: managerName ?? this.managerName,
      phone: phone ?? this.phone,
      isActive: isActive ?? this.isActive,
      operatingHours: operatingHours ?? this.operatingHours,
      createdAt: createdAt,
    );
  }
}

// ==================== PROMOTIONS & DISCOUNTS ====================

enum PromotionType { percentage, fixed, buyOneGetOne, bundle, flash }

class Promotion {
  final String id;
  final String shopId;
  final String name;
  final String description;
  final PromotionType type;
  final double discountValue;
  final DateTime startDate;
  final DateTime endDate;
  final List<String> productIds;
  final bool isActive;
  final int? usageLimit;
  final int? usageCount;
  final String? code;
  final double? minimumOrderAmount;
  final DateTime createdAt;

  Promotion({
    required this.id,
    required this.shopId,
    required this.name,
    required this.description,
    required this.type,
    required this.discountValue,
    required this.startDate,
    required this.endDate,
    this.productIds = const [],
    this.isActive = true,
    this.usageLimit,
    this.usageCount = 0,
    this.code,
    this.minimumOrderAmount,
    required this.createdAt,
  });

  bool get isExpired => DateTime.now().isAfter(endDate);
  bool get isStarted => DateTime.now().isAfter(startDate);
  bool get isCurrentlyActive => isActive && isStarted && !isExpired;

  factory Promotion.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Promotion(
      id: doc.id,
      shopId: data['shopId'] ?? '',
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      type: PromotionType.values.firstWhere(
        (e) => e.name == data['type'],
        orElse: () => PromotionType.percentage,
      ),
      discountValue: (data['discountValue'] ?? 0.0).toDouble(),
      startDate: (data['startDate'] as Timestamp?)?.toDate() ?? DateTime.now(),
      endDate: (data['endDate'] as Timestamp?)?.toDate() ?? DateTime.now(),
      productIds: List<String>.from(data['productIds'] ?? []),
      isActive: data['isActive'] ?? true,
      usageLimit: data['usageLimit'],
      usageCount: data['usageCount'] ?? 0,
      code: data['code'],
      minimumOrderAmount: data['minimumOrderAmount']?.toDouble(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'shopId': shopId,
      'name': name,
      'description': description,
      'type': type.name,
      'discountValue': discountValue,
      'startDate': Timestamp.fromDate(startDate),
      'endDate': Timestamp.fromDate(endDate),
      'productIds': productIds,
      'isActive': isActive,
      'usageLimit': usageLimit,
      'usageCount': usageCount,
      'code': code,
      'minimumOrderAmount': minimumOrderAmount,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }

  Promotion copyWith({
    String? name,
    String? description,
    PromotionType? type,
    double? discountValue,
    DateTime? startDate,
    DateTime? endDate,
    List<String>? productIds,
    bool? isActive,
    int? usageLimit,
    int? usageCount,
    String? code,
    double? minimumOrderAmount,
  }) {
    return Promotion(
      id: id,
      shopId: shopId,
      name: name ?? this.name,
      description: description ?? this.description,
      type: type ?? this.type,
      discountValue: discountValue ?? this.discountValue,
      startDate: startDate ?? this.startDate,
      endDate: endDate ?? this.endDate,
      productIds: productIds ?? this.productIds,
      isActive: isActive ?? this.isActive,
      usageLimit: usageLimit ?? this.usageLimit,
      usageCount: usageCount ?? this.usageCount,
      code: code ?? this.code,
      minimumOrderAmount: minimumOrderAmount ?? this.minimumOrderAmount,
      createdAt: createdAt,
    );
  }
}

// ==================== INVOICING & RECEIPTS ====================

class Invoice {
  final String id;
  final String shopId;
  final String orderId;
  final String customerName;
  final String customerPhone;
  final List<InvoiceItem> items;
  final double subtotal;
  final double taxAmount;
  final double discountAmount;
  final double deliveryFee;
  final double total;
  final String paymentMethod;
  final String paymentStatus;
  final String? branchId;
  final String? staffId;
  final String? staffName;
  final String? notes;
  final DateTime createdAt;

  Invoice({
    required this.id,
    required this.shopId,
    required this.orderId,
    required this.customerName,
    required this.customerPhone,
    required this.items,
    required this.subtotal,
    this.taxAmount = 0,
    this.discountAmount = 0,
    this.deliveryFee = 0,
    required this.total,
    required this.paymentMethod,
    required this.paymentStatus,
    this.branchId,
    this.staffId,
    this.staffName,
    this.notes,
    required this.createdAt,
  });

  factory Invoice.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Invoice(
      id: doc.id,
      shopId: data['shopId'] ?? '',
      orderId: data['orderId'] ?? '',
      customerName: data['customerName'] ?? '',
      customerPhone: data['customerPhone'] ?? '',
      items: (data['items'] as List<dynamic>?)
              ?.map((item) => InvoiceItem.fromMap(item))
              .toList() ??
          [],
      subtotal: (data['subtotal'] ?? 0.0).toDouble(),
      taxAmount: (data['taxAmount'] ?? 0.0).toDouble(),
      discountAmount: (data['discountAmount'] ?? 0.0).toDouble(),
      deliveryFee: (data['deliveryFee'] ?? 0.0).toDouble(),
      total: (data['total'] ?? 0.0).toDouble(),
      paymentMethod: data['paymentMethod'] ?? '',
      paymentStatus: data['paymentStatus'] ?? 'pending',
      branchId: data['branchId'],
      staffId: data['staffId'],
      staffName: data['staffName'],
      notes: data['notes'],
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'shopId': shopId,
      'orderId': orderId,
      'customerName': customerName,
      'customerPhone': customerPhone,
      'items': items.map((item) => item.toMap()).toList(),
      'subtotal': subtotal,
      'taxAmount': taxAmount,
      'discountAmount': discountAmount,
      'deliveryFee': deliveryFee,
      'total': total,
      'paymentMethod': paymentMethod,
      'paymentStatus': paymentStatus,
      'branchId': branchId,
      'staffId': staffId,
      'staffName': staffName,
      'notes': notes,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}

class InvoiceItem {
  final String productId;
  final String productName;
  final double unitPrice;
  final int quantity;
  final double discount;
  final double total;

  InvoiceItem({
    required this.productId,
    required this.productName,
    required this.unitPrice,
    required this.quantity,
    this.discount = 0,
    required this.total,
  });

  factory InvoiceItem.fromMap(Map<String, dynamic> map) {
    return InvoiceItem(
      productId: map['productId'] ?? '',
      productName: map['productName'] ?? '',
      unitPrice: (map['unitPrice'] ?? 0.0).toDouble(),
      quantity: map['quantity'] ?? 1,
      discount: (map['discount'] ?? 0.0).toDouble(),
      total: (map['total'] ?? 0.0).toDouble(),
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'productId': productId,
      'productName': productName,
      'unitPrice': unitPrice,
      'quantity': quantity,
      'discount': discount,
      'total': total,
    };
  }
}

// ==================== STOCK HISTORY ====================

enum StockChangeType {
  purchase,
  sale,
  return_,
  adjustment,
  damage,
  expiry,
  transfer
}

class StockHistory {
  final String id;
  final String shopId;
  final String productId;
  final String productName;
  final int quantityChange;
  final int previousStock;
  final int newStock;
  final StockChangeType type;
  final String? notes;
  final String? staffId;
  final String? staffName;
  final DateTime createdAt;

  StockHistory({
    required this.id,
    required this.shopId,
    required this.productId,
    required this.productName,
    required this.quantityChange,
    required this.previousStock,
    required this.newStock,
    required this.type,
    this.notes,
    this.staffId,
    this.staffName,
    required this.createdAt,
  });

  factory StockHistory.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return StockHistory(
      id: doc.id,
      shopId: data['shopId'] ?? '',
      productId: data['productId'] ?? '',
      productName: data['productName'] ?? '',
      quantityChange: data['quantityChange'] ?? 0,
      previousStock: data['previousStock'] ?? 0,
      newStock: data['newStock'] ?? 0,
      type: StockChangeType.values.firstWhere(
        (e) => e.name == data['type'],
        orElse: () => StockChangeType.adjustment,
      ),
      notes: data['notes'],
      staffId: data['staffId'],
      staffName: data['staffName'],
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'shopId': shopId,
      'productId': productId,
      'productName': productName,
      'quantityChange': quantityChange,
      'previousStock': previousStock,
      'newStock': newStock,
      'type': type.name,
      'notes': notes,
      'staffId': staffId,
      'staffName': staffName,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}

// ==================== CUSTOMER CRM ====================

class CustomerProfile {
  final String id;
  final String phone;
  final String? name;
  final String? email;
  final int totalOrders;
  final double totalSpent;
  final double averageOrderValue;
  final DateTime firstOrderAt;
  final DateTime lastOrderAt;
  final List<String> favoriteProductIds;
  final List<String> visitedShopIds;
  final int loyaltyPoints;
  final String? notes;
  final DateTime createdAt;
  final DateTime updatedAt;

  CustomerProfile({
    required this.id,
    required this.phone,
    this.name,
    this.email,
    this.totalOrders = 0,
    this.totalSpent = 0,
    this.averageOrderValue = 0,
    required this.firstOrderAt,
    required this.lastOrderAt,
    this.favoriteProductIds = const [],
    this.visitedShopIds = const [],
    this.loyaltyPoints = 0,
    this.notes,
    required this.createdAt,
    required this.updatedAt,
  });

  factory CustomerProfile.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return CustomerProfile(
      id: doc.id,
      phone: data['phone'] ?? '',
      name: data['name'],
      email: data['email'],
      totalOrders: data['totalOrders'] ?? 0,
      totalSpent: (data['totalSpent'] ?? 0.0).toDouble(),
      averageOrderValue: (data['averageOrderValue'] ?? 0.0).toDouble(),
      firstOrderAt: (data['firstOrderAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      lastOrderAt: (data['lastOrderAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      favoriteProductIds: List<String>.from(data['favoriteProductIds'] ?? []),
      visitedShopIds: List<String>.from(data['visitedShopIds'] ?? []),
      loyaltyPoints: data['loyaltyPoints'] ?? 0,
      notes: data['notes'],
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'phone': phone,
      'name': name,
      'email': email,
      'totalOrders': totalOrders,
      'totalSpent': totalSpent,
      'averageOrderValue': averageOrderValue,
      'firstOrderAt': Timestamp.fromDate(firstOrderAt),
      'lastOrderAt': Timestamp.fromDate(lastOrderAt),
      'favoriteProductIds': favoriteProductIds,
      'visitedShopIds': visitedShopIds,
      'loyaltyPoints': loyaltyPoints,
      'notes': notes,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': Timestamp.fromDate(updatedAt),
    };
  }

  CustomerProfile copyWith({
    String? name,
    String? email,
    int? totalOrders,
    double? totalSpent,
    double? averageOrderValue,
    DateTime? lastOrderAt,
    List<String>? favoriteProductIds,
    List<String>? visitedShopIds,
    int? loyaltyPoints,
    String? notes,
  }) {
    return CustomerProfile(
      id: id,
      phone: phone,
      name: name ?? this.name,
      email: email ?? this.email,
      totalOrders: totalOrders ?? this.totalOrders,
      totalSpent: totalSpent ?? this.totalSpent,
      averageOrderValue: averageOrderValue ?? this.averageOrderValue,
      firstOrderAt: firstOrderAt,
      lastOrderAt: lastOrderAt ?? this.lastOrderAt,
      favoriteProductIds: favoriteProductIds ?? this.favoriteProductIds,
      visitedShopIds: visitedShopIds ?? this.visitedShopIds,
      loyaltyPoints: loyaltyPoints ?? this.loyaltyPoints,
      notes: notes ?? this.notes,
      createdAt: createdAt,
      updatedAt: DateTime.now(),
    );
  }
}
