import '../../domain/entities/trip.dart';

class TripModel extends Trip {
  TripModel({
    required super.id,
    required super.status,
    required super.pickupAddress,
    required super.dropoffAddress,
    required super.estimatedPrice,
    super.finalPrice,
    super.driverId,
    required super.serviceType,
    required super.createdAt,
    super.startedAt,
    super.completedAt,
    required super.pickupLat,
    required super.pickupLng,
    required super.dropoffLat,
    required super.dropoffLng,
    super.distanceKm,
    super.durationMinutes,
  });

  factory TripModel.fromJson(Map<String, dynamic> json) {
    return TripModel(
      id: json['id'] as String,
      status: _parseStatus(json['status'] as String),
      pickupAddress: json['pickup_address'] as String,
      dropoffAddress: json['dropoff_address'] as String,
      estimatedPrice: (json['estimated_price'] as num).toDouble(),
      finalPrice: (json['final_price'] as num?)?.toDouble(),
      driverId: json['driver_id'] as String?,
      serviceType: json['service_type'] as String,
      createdAt: DateTime.parse(json['created_at'] as String),
      startedAt: json['started_at'] != null
          ? DateTime.parse(json['started_at'] as String)
          : null,
      completedAt: json['completed_at'] != null
          ? DateTime.parse(json['completed_at'] as String)
          : null,
      pickupLat: (json['pickup_latitude'] as num?)?.toDouble() ?? (json['pickup_lat'] as num?)?.toDouble() ?? 0.0,
      pickupLng: (json['pickup_longitude'] as num?)?.toDouble() ?? (json['pickup_lng'] as num?)?.toDouble() ?? 0.0,
      dropoffLat: (json['dropoff_latitude'] as num?)?.toDouble() ?? (json['dropoff_lat'] as num?)?.toDouble() ?? 0.0,
      dropoffLng: (json['dropoff_longitude'] as num?)?.toDouble() ?? (json['dropoff_lng'] as num?)?.toDouble() ?? 0.0,
      distanceKm: (json['distance_km'] as num?)?.toDouble(),
      durationMinutes: json['duration_min'] as int? ?? json['duration_minutes'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'status': status.name,
      'pickup_address': pickupAddress,
      'dropoff_address': dropoffAddress,
      'estimated_price': estimatedPrice,
      'final_price': finalPrice,
      'driver_id': driverId,
      'service_type': serviceType,
      'created_at': createdAt.toIso8601String(),
      'started_at': startedAt?.toIso8601String(),
      'completed_at': completedAt?.toIso8601String(),
      'pickup_lat': pickupLat,
      'pickup_lng': pickupLng,
      'dropoff_lat': dropoffLat,
      'dropoff_lng': dropoffLng,
      'distance_km': distanceKm,
      'duration_minutes': durationMinutes,
    };
  }

  static TripStatus _parseStatus(String status) {
    switch (status) {
      case 'pending':
        return TripStatus.pending;
      case 'accepted':
        return TripStatus.accepted;
      case 'arrived':
        return TripStatus.arrived;
      case 'in_progress':
        return TripStatus.inProgress;
      case 'completed':
        return TripStatus.completed;
      case 'cancelled':
        return TripStatus.cancelled;
      default:
        return TripStatus.pending;
    }
  }
}
