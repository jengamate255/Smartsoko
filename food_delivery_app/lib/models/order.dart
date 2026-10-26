import 'package:cloud_firestore/cloud_firestore.dart';

enum OrderStatus {
  pending,
  confirmed,
  preparing,
  ready,
  pickedUp,
  delivered,
  cancelled;

  /// The canonical status string the API server and the `orders` table use.
  ///
  /// The Dart enum is camelCase while the lifecycle is snake_case
  /// (`picked_up`, `ready_for_delivery`), and the server's state machine maps
  /// `confirmed` onto `accepted`. Sending [name] (the previous behaviour)
  /// stored values that neither the state machine nor [Order.fromMap] knew.
  String get apiValue {
    switch (this) {
      case OrderStatus.pending:
        return 'pending';
      case OrderStatus.confirmed:
        return 'accepted';
      case OrderStatus.preparing:
        return 'preparing';
      case OrderStatus.ready:
        return 'ready_for_delivery';
      case OrderStatus.pickedUp:
        return 'picked_up';
      case OrderStatus.delivered:
        return 'delivered';
      case OrderStatus.cancelled:
        return 'cancelled';
    }
  }

  /// Parses a status from the API/DB, folding the legacy aliases the server
  /// accepts so a `ready_for_delivery` order is not silently shown as pending.
  static OrderStatus fromApiValue(Object? value) {
    switch (value?.toString().trim().toLowerCase() ?? '') {
      case 'accepted':
      case 'confirmed':
        return OrderStatus.confirmed;
      case 'preparing':
        return OrderStatus.preparing;
      case 'ready_for_delivery':
      case 'ready':
      case 'assigned':
        return OrderStatus.ready;
      case 'picked_up':
      case 'pickedup':
      case 'in_transit':
      case 'dispatched':
        return OrderStatus.pickedUp;
      case 'delivered':
      case 'completed':
        return OrderStatus.delivered;
      case 'cancelled':
      case 'canceled':
      case 'refunded':
        return OrderStatus.cancelled;
      default:
        return OrderStatus.pending;
    }
  }
}

enum PaymentStatus {
  pending,
  processing,
  completed,
  failed,
  refunded;

  /// Parses `orders.payment_status`, whose stored values are `pending`,
  /// `pending_confirmation`, `paid` and `cod` — none of which are enum names.
  static PaymentStatus fromApiValue(Object? value) {
    switch (value?.toString().trim().toLowerCase() ?? '') {
      case 'paid':
      case 'completed':
        return PaymentStatus.completed;
      case 'processing':
        return PaymentStatus.processing;
      case 'failed':
        return PaymentStatus.failed;
      case 'refunded':
        return PaymentStatus.refunded;
      default:
        return PaymentStatus.pending;
    }
  }
}

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
      items:
          (data['items'] as List<dynamic>?)
              ?.map((e) => OrderItem.fromMap(e as Map<String, dynamic>))
              .toList() ??
          [],
      subtotal: (data['subtotal'] ?? 0).toDouble(),
      deliveryFee: (data['deliveryFee'] ?? 0).toDouble(),
      total: (data['total'] ?? 0).toDouble(),
      status: OrderStatus.fromApiValue(data['status']),
      paymentStatus: PaymentStatus.fromApiValue(data['paymentStatus']),
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
      restaurantId:
          data['restaurant_id']?.toString() ?? data['restaurantId'] ?? '',
      items: (data['items'] is List)
          ? (data['items'] as List)
                .map((e) => OrderItem.fromMap(e as Map<String, dynamic>))
                .toList()
          : [],
      subtotal: (data['subtotal'] ?? 0).toDouble(),
      deliveryFee: (data['delivery_fee'] ?? data['deliveryFee'] ?? 0)
          .toDouble(),
      total: (data['total'] ?? 0).toDouble(),
      status: OrderStatus.fromApiValue(data['status']),
      paymentStatus: PaymentStatus.fromApiValue(
        data['payment_status'] ?? data['paymentStatus'],
      ),
      paymentId: data['payment_id']?.toString() ?? data['paymentId'],
      deliveryAddress:
          data['delivery_address'] ?? data['deliveryAddress'] ?? '',
      deliveryLat: (data['delivery_latitude'] ?? data['deliveryLat'])
          ?.toDouble(),
      deliveryLng: (data['delivery_longitude'] ?? data['deliveryLng'])
          ?.toDouble(),
      riderNotes: data['special_instructions'] ?? data['riderNotes'],
      createdAt: data['created_at'] != null
          ? DateTime.parse(data['created_at'])
          : DateTime.now(),
      updatedAt: data['updated_at'] != null
          ? DateTime.parse(data['updated_at'])
          : null,
      deliveredAt: data['completed_at'] != null
          ? DateTime.parse(data['completed_at'])
          : null,
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
      'deliveredAt': deliveredAt != null
          ? Timestamp.fromDate(deliveredAt!)
          : null,
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
