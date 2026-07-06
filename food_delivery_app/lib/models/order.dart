import 'package:cloud_firestore/cloud_firestore.dart';

enum OrderStatus { pending, confirmed, preparing, ready, pickedUp, delivered, cancelled }

enum PaymentStatus { pending, processing, completed, failed, refunded }

class Order {
  final String id;
  final String userId;
  final String? riderId;
  final String restaurantId;
  final List<OrderItem> items;
  final double subtotal;
  final double deliveryFee;
  final double total;
  final OrderStatus status;
  final PaymentStatus paymentStatus;
  final String? paymentId;
  final String deliveryAddress;
  final double? deliveryLat;
  final double? deliveryLng;
  final String? riderNotes;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? deliveredAt;

  Order({
    required this.id,
    required this.userId,
    this.riderId,
    required this.restaurantId,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.total,
    required this.status,
    required this.paymentStatus,
    this.paymentId,
    required this.deliveryAddress,
    this.deliveryLat,
    this.deliveryLng,
    this.riderNotes,
    required this.createdAt,
    this.updatedAt,
    this.deliveredAt,
  });

  factory Order.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Order(
      id: doc.id,
      userId: data['userId'] ?? '',
      riderId: data['riderId'],
      restaurantId: data['restaurantId'] ?? '',
      items: (data['items'] as List<dynamic>?)
              ?.map((e) => OrderItem.fromMap(e as Map<String, dynamic>))
              .toList() ??
          [],
      subtotal: (data['subtotal'] ?? 0).toDouble(),
      deliveryFee: (data['deliveryFee'] ?? 0).toDouble(),
      total: (data['total'] ?? 0).toDouble(),
      status: OrderStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => OrderStatus.pending,
      ),
      paymentStatus: PaymentStatus.values.firstWhere(
        (e) => e.name == data['paymentStatus'],
        orElse: () => PaymentStatus.pending,
      ),
      paymentId: data['paymentId'],
      deliveryAddress: data['deliveryAddress'] ?? '',
      deliveryLat: data['deliveryLat']?.toDouble(),
      deliveryLng: data['deliveryLng']?.toDouble(),
      riderNotes: data['riderNotes'],
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate(),
      deliveredAt: (data['deliveredAt'] as Timestamp?)?.toDate(),
    );
  }

  factory Order.fromMap(Map<String, dynamic> data) {
    return Order(
      id: data['id']?.toString() ?? '',
      userId: data['customer_id']?.toString() ?? data['userId'] ?? '',
      riderId: data['driver_id']?.toString() ?? data['riderId'],
      restaurantId: data['restaurant_id']?.toString() ?? data['restaurantId'] ?? '',
      items: (data['items'] is List)
          ? (data['items'] as List).map((e) => OrderItem.fromMap(e as Map<String, dynamic>)).toList()
          : [],
      subtotal: (data['subtotal'] ?? 0).toDouble(),
      deliveryFee: (data['delivery_fee'] ?? data['deliveryFee'] ?? 0).toDouble(),
      total: (data['total'] ?? 0).toDouble(),
      status: OrderStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => OrderStatus.pending,
      ),
      paymentStatus: PaymentStatus.values.firstWhere(
        (e) => e.name == (data['payment_status'] ?? data['paymentStatus']),
        orElse: () => PaymentStatus.pending,
      ),
      paymentId: data['payment_id']?.toString() ?? data['paymentId'],
      deliveryAddress: data['delivery_address'] ?? data['deliveryAddress'] ?? '',
      deliveryLat: (data['delivery_latitude'] ?? data['deliveryLat'])?.toDouble(),
      deliveryLng: (data['delivery_longitude'] ?? data['deliveryLng'])?.toDouble(),
      riderNotes: data['special_instructions'] ?? data['riderNotes'],
      createdAt: data['created_at'] != null 
          ? DateTime.parse(data['created_at']) 
          : DateTime.now(),
      updatedAt: data['updated_at'] != null ? DateTime.parse(data['updated_at']) : null,
      deliveredAt: data['completed_at'] != null ? DateTime.parse(data['completed_at']) : null,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'riderId': riderId,
      'restaurantId': restaurantId,
      'items': items.map((e) => e.toMap()).toList(),
      'subtotal': subtotal,
      'deliveryFee': deliveryFee,
      'total': total,
      'status': status.name,
      'paymentStatus': paymentStatus.name,
      'paymentId': paymentId,
      'deliveryAddress': deliveryAddress,
      'deliveryLat': deliveryLat,
      'deliveryLng': deliveryLng,
      'riderNotes': riderNotes,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      'deliveredAt': deliveredAt != null ? Timestamp.fromDate(deliveredAt!) : null,
    };
  }
}

class OrderItem {
  final String id;
  final String name;
  final double price;
  final int quantity;
  final String? notes;

  OrderItem({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    this.notes,
  });

  factory OrderItem.fromMap(Map<String, dynamic> map) {
    return OrderItem(
      id: map['id']?.toString() ?? map['productId']?.toString() ?? '',
      name: map['name'] ?? map['productName'] ?? '',
      price: (map['price'] ?? 0).toDouble(),
      quantity: map['quantity'] ?? 1,
      notes: map['notes'],
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'price': price,
      'quantity': quantity,
      'notes': notes,
    };
  }
}
