import 'package:cloud_firestore/cloud_firestore.dart';

enum ShopType {
  grocery,
  electronics,
  clothing,
  pharmacy,
  hardware,
  beauty,
  restaurant,
  fish,
  farming,
  dairy,
  other
}

extension ShopTypeExtension on ShopType {
  String get displayName {
    switch (this) {
      case ShopType.grocery:
        return 'Duka la Vyakula (Grocery)';
      case ShopType.electronics:
        return 'Duka la Vifaa vya Elektroniki (Electronics)';
      case ShopType.clothing:
        return 'Duka la Nguo (Clothing)';
      case ShopType.pharmacy:
        return 'Duka la Dawa (Pharmacy)';
      case ShopType.hardware:
        return 'Duka la Vifaa vya Ujenzi (Hardware)';
      case ShopType.beauty:
        return 'Duka la Vipodozi (Beauty & Cosmetics)';
      case ShopType.restaurant:
        return 'Hoteli (Restaurant)';
      case ShopType.fish:
        return 'Duka la Samaki (Fish Market)';
      case ShopType.farming:
        return 'Biashara ya Kilimo (Farming)';
      case ShopType.dairy:
        return 'Duka la Maziwa (Dairy)';
      case ShopType.other:
        return 'Biashara Nyingine (Other)';
    }
  }
}

class Shop {
  final String id;
  final String name;
  final String description;
  final String? imageUrl;
  final String address;
  final double lat;
  final double lng;
  final String ownerId;
  final String ownerName;
  final String ownerPhone;
  final ShopType type;
  final String category;
  final double rating;
  final bool isOpen;
  final bool isVerified;
  final List<String> tags;
  final String? whatsappNumber;
  final String? instagramHandle;
  final String? facebookPage;
  final DateTime createdAt;
  final DateTime? updatedAt;

  Shop({
    required this.id,
    required this.name,
    required this.description,
    this.imageUrl,
    required this.address,
    required this.lat,
    required this.lng,
    required this.ownerId,
    required this.ownerName,
    required this.ownerPhone,
    required this.type,
    required this.category,
    this.rating = 0.0,
    this.isOpen = true,
    this.isVerified = false,
    this.tags = const [],
    this.whatsappNumber,
    this.instagramHandle,
    this.facebookPage,
    required this.createdAt,
    this.updatedAt,
  });

  factory Shop.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Shop(
      id: doc.id,
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      imageUrl: data['imageUrl'],
      address: data['address'] ?? '',
      lat: (data['lat'] ?? 0.0).toDouble(),
      lng: (data['lng'] ?? 0.0).toDouble(),
      ownerId: data['ownerId'] ?? '',
      ownerName: data['ownerName'] ?? '',
      ownerPhone: data['ownerPhone'] ?? '',
      type: ShopType.values.firstWhere(
        (e) => e.name == data['type'],
        orElse: () => ShopType.other,
      ),
      category: data['category'] ?? '',
      rating: (data['rating'] ?? 0.0).toDouble(),
      isOpen: data['isOpen'] ?? true,
      isVerified: data['isVerified'] ?? false,
      tags: List<String>.from(data['tags'] ?? []),
      whatsappNumber: data['whatsappNumber'],
      instagramHandle: data['instagramHandle'],
      facebookPage: data['facebookPage'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: data['updatedAt'] != null
          ? (data['updatedAt'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'description': description,
      'imageUrl': imageUrl,
      'address': address,
      'lat': lat,
      'lng': lng,
      'ownerId': ownerId,
      'ownerName': ownerName,
      'ownerPhone': ownerPhone,
      'type': type.name,
      'category': category,
      'rating': rating,
      'isOpen': isOpen,
      'isVerified': isVerified,
      'tags': tags,
      'whatsappNumber': whatsappNumber,
      'instagramHandle': instagramHandle,
      'facebookPage': facebookPage,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
    };
  }

  Shop copyWith({
    String? name,
    String? description,
    String? imageUrl,
    String? address,
    double? lat,
    double? lng,
    String? ownerName,
    String? ownerPhone,
    ShopType? type,
    String? category,
    double? rating,
    bool? isOpen,
    bool? isVerified,
    List<String>? tags,
    String? whatsappNumber,
    String? instagramHandle,
    String? facebookPage,
    DateTime? updatedAt,
  }) {
    return Shop(
      id: id,
      name: name ?? this.name,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      address: address ?? this.address,
      lat: lat ?? this.lat,
      lng: lng ?? this.lng,
      ownerId: ownerId,
      ownerName: ownerName ?? this.ownerName,
      ownerPhone: ownerPhone ?? this.ownerPhone,
      type: type ?? this.type,
      category: category ?? this.category,
      rating: rating ?? this.rating,
      isOpen: isOpen ?? this.isOpen,
      isVerified: isVerified ?? this.isVerified,
      tags: tags ?? this.tags,
      whatsappNumber: whatsappNumber ?? this.whatsappNumber,
      instagramHandle: instagramHandle ?? this.instagramHandle,
      facebookPage: facebookPage ?? this.facebookPage,
      createdAt: createdAt,
      updatedAt: updatedAt ?? DateTime.now(),
    );
  }
}

class Product {
  final String id;
  final String shopId;
  final String name;
  final String description;
  final double price;
  final String? imageUrl;
  final String category;
  final int stockQuantity;
  final bool isAvailable;
  final String? unit; // e.g., "piece", "kg", "litre", "packet"
  final Map<String, dynamic>? attributes; // Additional product attributes
  final DateTime createdAt;
  final DateTime? updatedAt;

  Product({
    required this.id,
    required this.shopId,
    required this.name,
    required this.description,
    required this.price,
    this.imageUrl,
    required this.category,
    this.stockQuantity = 0,
    this.isAvailable = true,
    this.unit,
    this.attributes,
    required this.createdAt,
    this.updatedAt,
  });

  factory Product.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Product(
      id: doc.id,
      shopId: data['shopId'] ?? '',
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      price: (data['price'] ?? 0.0).toDouble(),
      imageUrl: data['imageUrl'],
      category: data['category'] ?? '',
      stockQuantity: data['stockQuantity'] ?? 0,
      isAvailable: data['isAvailable'] ?? true,
      unit: data['unit'],
      attributes: data['attributes'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: data['updatedAt'] != null
          ? (data['updatedAt'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'shopId': shopId,
      'name': name,
      'description': description,
      'price': price,
      'imageUrl': imageUrl,
      'category': category,
      'stockQuantity': stockQuantity,
      'isAvailable': isAvailable,
      'unit': unit,
      'attributes': attributes,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
    };
  }

  Product copyWith({
    String? name,
    String? description,
    double? price,
    String? imageUrl,
    String? category,
    int? stockQuantity,
    bool? isAvailable,
    String? unit,
    Map<String, dynamic>? attributes,
    DateTime? updatedAt,
  }) {
    return Product(
      id: id,
      shopId: shopId,
      name: name ?? this.name,
      description: description ?? this.description,
      price: price ?? this.price,
      imageUrl: imageUrl ?? this.imageUrl,
      category: category ?? this.category,
      stockQuantity: stockQuantity ?? this.stockQuantity,
      isAvailable: isAvailable ?? this.isAvailable,
      unit: unit ?? this.unit,
      attributes: attributes ?? this.attributes,
      createdAt: createdAt,
      updatedAt: updatedAt ?? DateTime.now(),
    );
  }
}

class ShopOrder {
  final String id;
  final String userId;
  final String shopId;
  final String shopName;
  final List<ShopOrderItem> items;
  final double subtotal;
  final double deliveryFee;
  final double total;
  final String status;
  final String? riderId;
  final String deliveryAddress;
  final double deliveryLat;
  final double deliveryLng;
  final String? customerNotes;
  final String? riderNotes;
  final String? paymentId;
  final String? paymentStatus;
  final DateTime createdAt;
  final DateTime? updatedAt;
  final DateTime? deliveredAt;

  ShopOrder({
    required this.id,
    required this.userId,
    required this.shopId,
    required this.shopName,
    required this.items,
    required this.subtotal,
    required this.deliveryFee,
    required this.total,
    required this.status,
    this.riderId,
    required this.deliveryAddress,
    required this.deliveryLat,
    required this.deliveryLng,
    this.customerNotes,
    this.riderNotes,
    this.paymentId,
    this.paymentStatus,
    required this.createdAt,
    this.updatedAt,
    this.deliveredAt,
  });

  factory ShopOrder.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return ShopOrder(
      id: doc.id,
      userId: data['userId'] ?? '',
      shopId: data['shopId'] ?? '',
      shopName: data['shopName'] ?? '',
      items: (data['items'] as List<dynamic>?)
              ?.map((item) => ShopOrderItem.fromMap(item))
              .toList() ??
          [],
      subtotal: (data['subtotal'] ?? 0.0).toDouble(),
      deliveryFee: (data['deliveryFee'] ?? 0.0).toDouble(),
      total: (data['total'] ?? 0.0).toDouble(),
      status: data['status'] ?? 'pending',
      riderId: data['riderId'],
      deliveryAddress: data['deliveryAddress'] ?? '',
      deliveryLat: (data['deliveryLat'] ?? 0.0).toDouble(),
      deliveryLng: (data['deliveryLng'] ?? 0.0).toDouble(),
      customerNotes: data['customerNotes'],
      riderNotes: data['riderNotes'],
      paymentId: data['paymentId'],
      paymentStatus: data['paymentStatus'],
      createdAt: (data['createdAt'] as Timestamp).toDate(),
      updatedAt: data['updatedAt'] != null
          ? (data['updatedAt'] as Timestamp).toDate()
          : null,
      deliveredAt: data['deliveredAt'] != null
          ? (data['deliveredAt'] as Timestamp).toDate()
          : null,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'shopId': shopId,
      'shopName': shopName,
      'items': items.map((item) => item.toMap()).toList(),
      'subtotal': subtotal,
      'deliveryFee': deliveryFee,
      'total': total,
      'status': status,
      'riderId': riderId,
      'deliveryAddress': deliveryAddress,
      'deliveryLat': deliveryLat,
      'deliveryLng': deliveryLng,
      'customerNotes': customerNotes,
      'riderNotes': riderNotes,
      'paymentId': paymentId,
      'paymentStatus': paymentStatus,
      'createdAt': Timestamp.fromDate(createdAt),
      'updatedAt': updatedAt != null ? Timestamp.fromDate(updatedAt!) : null,
      'deliveredAt':
          deliveredAt != null ? Timestamp.fromDate(deliveredAt!) : null,
    };
  }
}

class ShopOrderItem {
  final String id;
  final String name;
  final double price;
  final int quantity;
  final String? notes;

  ShopOrderItem({
    required this.id,
    required this.name,
    required this.price,
    required this.quantity,
    this.notes,
  });

  factory ShopOrderItem.fromMap(Map<String, dynamic> map) {
    return ShopOrderItem(
      id: map['id'] ?? '',
      name: map['name'] ?? '',
      price: (map['price'] ?? 0.0).toDouble(),
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
