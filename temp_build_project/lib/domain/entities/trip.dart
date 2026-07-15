import 'driver.dart';
import 'location_data.dart';

enum TripStatus {
  pending,
  requested,
  searching,
  driverAssigned,
  arriving,
  accepted,
  arrived,
  inProgress,
  completed,
  cancelled,
}

class Trip {
  final String id;
  final TripStatus status;
  final String pickupAddress;
  final String dropoffAddress;
  final double estimatedPrice;
  final double? finalPrice;
  final String? driverId;
  final String serviceType;
  final DateTime createdAt;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final double pickupLat;
  final double pickupLng;
  final double dropoffLat;
  final double dropoffLng;
  final double? distanceKm;
  final int? durationMinutes;
  final String? userId;
  final LocationData? pickupLocation;
  final LocationData? dropoffLocation;
  final Driver? driver;
  final int? etaMinutes;
  final double? estimatedDistance;
  final double? estimatedDuration;
  final String? paymentMethod;
  final double? driverLatitude;
  final double? driverLongitude;

  Trip({
    required this.id,
    required this.status,
    required this.pickupAddress,
    required this.dropoffAddress,
    required this.estimatedPrice,
    this.finalPrice,
    this.driverId,
    required this.serviceType,
    required this.createdAt,
    this.startedAt,
    this.completedAt,
    required this.pickupLat,
    required this.pickupLng,
    required this.dropoffLat,
    required this.dropoffLng,
    this.distanceKm,
    this.durationMinutes,
    this.userId,
    this.pickupLocation,
    this.dropoffLocation,
    this.driver,
    this.etaMinutes,
    this.estimatedDistance,
    this.estimatedDuration,
    this.paymentMethod,
    this.driverLatitude,
    this.driverLongitude,
  });

  Trip copyWith({
    String? id,
    TripStatus? status,
    String? pickupAddress,
    String? dropoffAddress,
    double? estimatedPrice,
    double? finalPrice,
    String? driverId,
    String? serviceType,
    DateTime? createdAt,
    DateTime? startedAt,
    DateTime? completedAt,
    double? pickupLat,
    double? pickupLng,
    double? dropoffLat,
    double? dropoffLng,
    double? distanceKm,
    int? durationMinutes,
    String? userId,
    LocationData? pickupLocation,
    LocationData? dropoffLocation,
    Driver? driver,
    int? etaMinutes,
    double? estimatedDistance,
    double? estimatedDuration,
    String? paymentMethod,
    double? driverLatitude,
    double? driverLongitude,
  }) {
    return Trip(
      id: id ?? this.id,
      status: status ?? this.status,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      dropoffAddress: dropoffAddress ?? this.dropoffAddress,
      estimatedPrice: estimatedPrice ?? this.estimatedPrice,
      finalPrice: finalPrice ?? this.finalPrice,
      driverId: driverId ?? this.driverId,
      serviceType: serviceType ?? this.serviceType,
      createdAt: createdAt ?? this.createdAt,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      pickupLat: pickupLat ?? this.pickupLat,
      pickupLng: pickupLng ?? this.pickupLng,
      dropoffLat: dropoffLat ?? this.dropoffLat,
      dropoffLng: dropoffLng ?? this.dropoffLng,
      distanceKm: distanceKm ?? this.distanceKm,
      durationMinutes: durationMinutes ?? this.durationMinutes,
      userId: userId ?? this.userId,
      pickupLocation: pickupLocation ?? this.pickupLocation,
      dropoffLocation: dropoffLocation ?? this.dropoffLocation,
      driver: driver ?? this.driver,
      etaMinutes: etaMinutes ?? this.etaMinutes,
      estimatedDistance: estimatedDistance ?? this.estimatedDistance,
      estimatedDuration: estimatedDuration ?? this.estimatedDuration,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      driverLatitude: driverLatitude ?? this.driverLatitude,
      driverLongitude: driverLongitude ?? this.driverLongitude,
    );
  }
}
