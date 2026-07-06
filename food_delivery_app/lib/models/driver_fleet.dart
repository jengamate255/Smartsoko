import 'package:cloud_firestore/cloud_firestore.dart';

enum DriverStatus { online, offline, busy, onBreak }

enum VehicleType { motorcycle, bicycle, car, van, truck }

class DriverProfile {
  final String id;
  final String phone;
  final String fullName;
  final String? email;
  final String? photoUrl;
  final VehicleType vehicleType;
  final String? vehiclePlate;
  final String? vehicleColor;
  final DriverStatus status;
  final bool isOnline;
  final double? currentLat;
  final double? currentLng;
  final String? assignedZone;
  final String? assignedShopId;
  final String? currentOrderId;
  final double rating;
  final int totalDeliveries;
  final double totalEarnings;
  final DateTime createdAt;
  final DateTime? lastActive;

  DriverProfile({
    required this.id,
    required this.phone,
    required this.fullName,
    this.email,
    this.photoUrl,
    required this.vehicleType,
    this.vehiclePlate,
    this.vehicleColor,
    required this.status,
    required this.isOnline,
    this.currentLat,
    this.currentLng,
    this.assignedZone,
    this.assignedShopId,
    this.currentOrderId,
    required this.rating,
    required this.totalDeliveries,
    required this.totalEarnings,
    required this.createdAt,
    this.lastActive,
  });

  factory DriverProfile.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return DriverProfile(
      id: doc.id,
      phone: data['phone'] ?? '',
      fullName: data['full_name'] ?? '',
      email: data['email'],
      photoUrl: data['photo_url'],
      vehicleType: VehicleType.values.firstWhere(
        (e) => e.name == (data['vehicle'] ?? 'motorcycle'),
        orElse: () => VehicleType.motorcycle,
      ),
      vehiclePlate: data['vehicle_plate'],
      vehicleColor: data['vehicle_color'],
      status: DriverStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => DriverStatus.offline,
      ),
      isOnline: data['is_online'] ?? false,
      currentLat: data['current_lat']?.toDouble(),
      currentLng: data['current_lng']?.toDouble(),
      assignedZone: data['assigned_zone'],
      assignedShopId: data['assigned_shop_id'],
      currentOrderId: data['current_order_id'],
      rating: (data['rating'] ?? 0.0).toDouble(),
      totalDeliveries: data['total_deliveries'] ?? 0,
      totalEarnings: (data['total_earnings'] ?? 0.0).toDouble(),
      createdAt: (data['created_at'] as Timestamp?)?.toDate() ?? DateTime.now(),
      lastActive: (data['lastActive'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'phone': phone,
      'full_name': fullName,
      'email': email,
      'photo_url': photoUrl,
      'vehicle': vehicleType.name,
      'vehicle_plate': vehiclePlate,
      'vehicle_color': vehicleColor,
      'status': status.name,
      'is_online': isOnline,
      'current_lat': currentLat,
      'current_lng': currentLng,
      'assigned_zone': assignedZone,
      'assigned_shop_id': assignedShopId,
      'current_order_id': currentOrderId,
      'rating': rating,
      'total_deliveries': totalDeliveries,
      'total_earnings': totalEarnings,
      'created_at': Timestamp.fromDate(createdAt),
      'lastActive': lastActive != null ? Timestamp.fromDate(lastActive!) : null,
    };
  }
}

class DeliveryZone {
  final String id;
  final String name;
  final String description;
  final double centerLat;
  final double centerLng;
  final double radiusKm;
  final List<String> driverIds;
  final bool isActive;

  DeliveryZone({
    required this.id,
    required this.name,
    required this.description,
    required this.centerLat,
    required this.centerLng,
    required this.radiusKm,
    required this.driverIds,
    required this.isActive,
  });

  factory DeliveryZone.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return DeliveryZone(
      id: doc.id,
      name: data['name'] ?? '',
      description: data['description'] ?? '',
      centerLat: (data['center_lat'] ?? 0.0).toDouble(),
      centerLng: (data['center_lng'] ?? 0.0).toDouble(),
      radiusKm: (data['radius_km'] ?? 5.0).toDouble(),
      driverIds: data['driver_ids'] != null ? List<String>.from(data['driver_ids']) : [],
      isActive: data['is_active'] ?? true,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'description': description,
      'center_lat': centerLat,
      'center_lng': centerLng,
      'radius_km': radiusKm,
      'driver_ids': driverIds,
      'is_active': isActive,
    };
  }
}
