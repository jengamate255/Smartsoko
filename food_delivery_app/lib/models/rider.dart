import 'package:cloud_firestore/cloud_firestore.dart';

class RiderLocation {
  final String riderId;
  final double lat;
  final double lng;
  final DateTime updatedAt;
  final bool isOnline;

  RiderLocation({
    required this.riderId,
    required this.lat,
    required this.lng,
    required this.updatedAt,
    required this.isOnline,
  });

  factory RiderLocation.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return RiderLocation(
      riderId: doc.id,
      lat: (data['lat'] ?? 0).toDouble(),
      lng: (data['lng'] ?? 0).toDouble(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      isOnline: data['isOnline'] ?? false,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'lat': lat,
      'lng': lng,
      'updatedAt': Timestamp.fromDate(updatedAt),
      'isOnline': isOnline,
    };
  }
}

class Rider {
  final String id;
  final String name;
  final String phone;
  final String? photoUrl;
  final double rating;
  final int totalDeliveries;
  final bool isOnline;
  final bool isAvailable;
  final String? currentOrderId;

  Rider({
    required this.id,
    required this.name,
    required this.phone,
    this.photoUrl,
    required this.rating,
    required this.totalDeliveries,
    required this.isOnline,
    required this.isAvailable,
    this.currentOrderId,
  });

  factory Rider.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Rider(
      id: doc.id,
      name: data['name'] ?? '',
      phone: data['phone'] ?? '',
      photoUrl: data['photoUrl'],
      rating: (data['rating'] ?? 0).toDouble(),
      totalDeliveries: data['totalDeliveries'] ?? 0,
      isOnline: data['isOnline'] ?? false,
      isAvailable: data['isAvailable'] ?? false,
      currentOrderId: data['currentOrderId'],
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'phone': phone,
      'photoUrl': photoUrl,
      'rating': rating,
      'totalDeliveries': totalDeliveries,
      'isOnline': isOnline,
      'isAvailable': isAvailable,
      'currentOrderId': currentOrderId,
    };
  }
}
