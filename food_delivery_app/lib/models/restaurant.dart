import 'package:cloud_firestore/cloud_firestore.dart';

class Restaurant {
  final String id;
  final String name;
  final String description;
  final String imageUrl;
  final String address;
  final double lat;
  final double lng;
  final String category;
  final double rating;
  final int deliveryTimeMinutes;
  final double deliveryFee;
  final bool isOpen;
  final DateTime createdAt;
  final String? ownerId;
  final String? openingTime;
  final String? closingTime;

  Restaurant({
    required this.id,
    required this.name,
    required this.description,
    required this.imageUrl,
    required this.address,
    required this.lat,
    required this.lng,
    required this.category,
    required this.rating,
    required this.deliveryTimeMinutes,
    required this.deliveryFee,
    required this.isOpen,
    required this.createdAt,
    this.ownerId,
    this.openingTime,
    this.closingTime,
  });

  factory Restaurant.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Restaurant(
      id: doc.id,
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      imageUrl: data['imageUrl'] ?? '',
      address: data['address'] ?? '',
      lat: (data['lat'] ?? 0).toDouble(),
      lng: (data['lng'] ?? 0).toDouble(),
      category: data['category'] ?? '',
      rating: (data['rating'] ?? 0).toDouble(),
      deliveryTimeMinutes: data['deliveryTimeMinutes'] ?? 30,
      deliveryFee: (data['deliveryFee'] ?? 0).toDouble(),
      isOpen: data['isOpen'] ?? true,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      ownerId: data['ownerId'],
      openingTime: data['openingTime'],
      closingTime: data['closingTime'],
    );
  }

  factory Restaurant.fromMap(Map<String, dynamic> data) {
    return Restaurant(
      id: data['id']?.toString() ?? '',
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      imageUrl: data['logo_url'] ?? data['imageUrl'] ?? '',
      address: data['address'] ?? '',
      lat: (data['latitude'] ?? data['lat'] ?? 0).toDouble(),
      lng: (data['longitude'] ?? data['lng'] ?? 0).toDouble(),
      category: data['category'] ?? '',
      rating: (data['rating'] ?? 0).toDouble(),
      deliveryTimeMinutes: data['delivery_time_minutes'] ?? data['deliveryTimeMinutes'] ?? 30,
      deliveryFee: (data['delivery_fee'] ?? data['deliveryFee'] ?? 0).toDouble(),
      isOpen: data['is_open'] ?? data['isOpen'] ?? true,
      createdAt: data['created_at'] != null 
          ? DateTime.parse(data['created_at']) 
          : DateTime.now(),
      ownerId: data['owner_id']?.toString() ?? data['ownerId'],
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
      'category': category,
      'rating': rating,
      'deliveryTimeMinutes': deliveryTimeMinutes,
      'deliveryFee': deliveryFee,
      'isOpen': isOpen,
      'createdAt': Timestamp.fromDate(createdAt),
      if (ownerId != null) 'ownerId': ownerId,
      if (openingTime != null) 'openingTime': openingTime,
      if (closingTime != null) 'closingTime': closingTime,
    };
  }
}

class MenuItemVariant {
  final String id;
  final String name;
  final String type;
  final double priceModifier;
  final int stock;
  final String? sku;
  final bool isAvailable;

  MenuItemVariant({
    required this.id,
    required this.name,
    required this.type,
    this.priceModifier = 0,
    this.stock = 0,
    this.sku,
    this.isAvailable = true,
  });

  double getEffectivePrice(double basePrice) => basePrice + priceModifier;

  factory MenuItemVariant.fromMap(Map<String, dynamic> data) {
    return MenuItemVariant(
      id: data['id'] ?? '',
      name: data['name'] ?? '',
      type: data['type'] ?? 'size',
      priceModifier: (data['priceModifier'] ?? 0).toDouble(),
      stock: data['stock'] ?? 0,
      sku: data['sku'],
      isAvailable: data['isAvailable'] ?? true,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'priceModifier': priceModifier,
      'stock': stock,
      'sku': sku,
      'isAvailable': isAvailable,
    };
  }
}

class MenuItem {
  final String id;
  final String restaurantId;
  final String name;
  final String description;
  final double price;
  final String imageUrl;
  final String category;
  final bool isAvailable;
  final List<MenuItemVariant> variants;

  MenuItem({
    required this.id,
    required this.restaurantId,
    required this.name,
    required this.description,
    required this.price,
    required this.imageUrl,
    required this.category,
    required this.isAvailable,
    this.variants = const [],
  });

  factory MenuItem.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    final variantsList = (data['variants'] as List<dynamic>?)
            ?.map((v) => MenuItemVariant.fromMap(v as Map<String, dynamic>))
            .toList() ??
        [];
    return MenuItem(
      id: doc.id,
      restaurantId: data['restaurantId'] ?? '',
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      price: (data['price'] ?? 0).toDouble(),
      imageUrl: data['imageUrl'] ?? '',
      category: data['category'] ?? '',
      isAvailable: data['isAvailable'] ?? true,
      variants: variantsList,
    );
  }

  factory MenuItem.fromMap(Map<String, dynamic> data) {
    final variantsList = (data['variants'] as List<dynamic>?)
            ?.map((v) => MenuItemVariant.fromMap(v as Map<String, dynamic>))
            .toList() ??
        [];
    return MenuItem(
      id: data['id']?.toString() ?? '',
      restaurantId: data['restaurant_id']?.toString() ?? data['restaurantId'] ?? '',
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      price: (data['price'] ?? 0).toDouble(),
      imageUrl: data['image_url'] ?? data['imageUrl'] ?? '',
      category: data['category'] ?? '',
      isAvailable: data['is_available'] ?? data['isAvailable'] ?? true,
      variants: variantsList,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'restaurantId': restaurantId,
      'name': name,
      'description': description,
      'price': price,
      'imageUrl': imageUrl,
      'category': category,
      'isAvailable': isAvailable,
      'variants': variants.map((v) => v.toMap()).toList(),
    };
  }
}
