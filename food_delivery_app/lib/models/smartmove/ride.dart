import 'package:json_annotation/json_annotation.dart';

part 'ride.g.dart';

enum RideStatus {
  @JsonValue('assigned')
  assigned,
  @JsonValue('driver_en_route')
  driverEnRoute,
  @JsonValue('driver_arrived')
  driverArrived,
  @JsonValue('in_progress')
  inProgress,
  @JsonValue('completed')
  completed,
  @JsonValue('cancelled')
  cancelled,
  @JsonValue('disputed')
  disputed,
}

@JsonSerializable()
class Ride {
  final String id;
  final String rideRequestId;
  final String customerId;
  final String driverId;
  final String? vehicleTypeId;
  final RideStatus status;
  final double pickupLatitude;
  final double pickupLongitude;
  final String pickupAddress;
  final double dropoffLatitude;
  final double dropoffLongitude;
  final String dropoffAddress;
  final DateTime? scheduledFor;
  final DateTime? startedAt;
  final DateTime? completedAt;
  final DateTime? cancelledAt;
  final String? cancelledBy;
  final String? cancellationReason;
  final double? actualDistanceKm;
  final int? actualDurationMinutes;
  final Map<String, dynamic>? routeGeometry;
  final double? routeDistanceKm;
  final int? routeDurationMinutes;
  final Map<String, dynamic> fareBreakdown;
  final int? totalFare;
  final int platformFee;
  final int driverEarnings;
  final int tipAmount;
  final String? paymentStatus;
  final String? paymentMethod;
  final String? transactionId;
  final double? customerRating;
  final String? customerFeedback;
  final double? driverRating;
  final String? driverFeedback;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  Ride({
    required this.id,
    required this.rideRequestId,
    required this.customerId,
    required this.driverId,
    this.vehicleTypeId,
    required this.status,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.pickupAddress,
    required this.dropoffLatitude,
    required this.dropoffLongitude,
    required this.dropoffAddress,
    this.scheduledFor,
    this.startedAt,
    this.completedAt,
    this.cancelledAt,
    this.cancelledBy,
    this.cancellationReason,
    this.actualDistanceKm,
    this.actualDurationMinutes,
    this.routeGeometry,
    this.routeDistanceKm,
    this.routeDurationMinutes,
    required this.fareBreakdown,
    this.totalFare,
    required this.platformFee,
    required this.driverEarnings,
    required this.tipAmount,
    this.paymentStatus,
    this.paymentMethod,
    this.transactionId,
    this.customerRating,
    this.customerFeedback,
    this.driverRating,
    this.driverFeedback,
    required this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Ride.fromJson(Map<String, dynamic> json) => _$RideFromJson(json);
  Map<String, dynamic> toJson() => _$RideToJson(this);

  Ride copyWith({
    String? id,
    String? rideRequestId,
    String? customerId,
    String? driverId,
    String? vehicleTypeId,
    RideStatus? status,
    double? pickupLatitude,
    double? pickupLongitude,
    String? pickupAddress,
    double? dropoffLatitude,
    double? dropoffLongitude,
    String? dropoffAddress,
    DateTime? scheduledFor,
    DateTime? startedAt,
    DateTime? completedAt,
    DateTime? cancelledAt,
    String? cancelledBy,
    String? cancellationReason,
    double? actualDistanceKm,
    int? actualDurationMinutes,
    Map<String, dynamic>? routeGeometry,
    double? routeDistanceKm,
    int? routeDurationMinutes,
    Map<String, dynamic>? fareBreakdown,
    int? totalFare,
    int? platformFee,
    int? driverEarnings,
    int? tipAmount,
    String? paymentStatus,
    String? paymentMethod,
    String? transactionId,
    double? customerRating,
    String? customerFeedback,
    double? driverRating,
    String? driverFeedback,
    Map<String, dynamic>? metadata,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Ride(
      id: id ?? this.id,
      rideRequestId: rideRequestId ?? this.rideRequestId,
      customerId: customerId ?? this.customerId,
      driverId: driverId ?? this.driverId,
      vehicleTypeId: vehicleTypeId ?? this.vehicleTypeId,
      status: status ?? this.status,
      pickupLatitude: pickupLatitude ?? this.pickupLatitude,
      pickupLongitude: pickupLongitude ?? this.pickupLongitude,
      pickupAddress: pickupAddress ?? this.pickupAddress,
      dropoffLatitude: dropoffLatitude ?? this.dropoffLatitude,
      dropoffLongitude: dropoffLongitude ?? this.dropoffLongitude,
      dropoffAddress: dropoffAddress ?? this.dropoffAddress,
      scheduledFor: scheduledFor ?? this.scheduledFor,
      startedAt: startedAt ?? this.startedAt,
      completedAt: completedAt ?? this.completedAt,
      cancelledAt: cancelledAt ?? this.cancelledAt,
      cancelledBy: cancelledBy ?? this.cancelledBy,
      cancellationReason: cancellationReason ?? this.cancellationReason,
      actualDistanceKm: actualDistanceKm ?? this.actualDistanceKm,
      actualDurationMinutes: actualDurationMinutes ?? this.actualDurationMinutes,
      routeGeometry: routeGeometry ?? this.routeGeometry,
      routeDistanceKm: routeDistanceKm ?? this.routeDistanceKm,
      routeDurationMinutes: routeDurationMinutes ?? this.routeDurationMinutes,
      fareBreakdown: fareBreakdown ?? this.fareBreakdown,
      totalFare: totalFare ?? this.totalFare,
      platformFee: platformFee ?? this.platformFee,
      driverEarnings: driverEarnings ?? this.driverEarnings,
      tipAmount: tipAmount ?? this.tipAmount,
      paymentStatus: paymentStatus ?? this.paymentStatus,
      paymentMethod: paymentMethod ?? this.paymentMethod,
      transactionId: transactionId ?? this.transactionId,
      customerRating: customerRating ?? this.customerRating,
      customerFeedback: customerFeedback ?? this.customerFeedback,
      driverRating: driverRating ?? this.driverRating,
      driverFeedback: driverFeedback ?? this.driverFeedback,
      metadata: metadata ?? this.metadata,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  // Convenience getters
  bool get isActive => [
    RideStatus.assigned,
    RideStatus.driverEnRoute,
    RideStatus.driverArrived,
    RideStatus.inProgress,
  ].contains(status);

  bool get canStart => status == RideStatus.driverArrived;
  bool get canComplete => status == RideStatus.inProgress;
  bool get canCancel => [
    RideStatus.assigned,
    RideStatus.driverEnRoute,
    RideStatus.driverArrived,
  ].contains(status);

  String get statusDisplayName {
    switch (status) {
      case RideStatus.assigned:
        return 'Driver assigned';
      case RideStatus.driverEnRoute:
        return 'Driver on the way';
      case RideStatus.driverArrived:
        return 'Driver arrived';
      case RideStatus.inProgress:
        return 'Ride in progress';
      case RideStatus.completed:
        return 'Completed';
      case RideStatus.cancelled:
        return 'Cancelled';
      case RideStatus.disputed:
        return 'Disputed';
    }
  }

  String get formattedTotalFare {
    if (totalFare == null) return 'TZS 0';
    return 'TZS ${totalFare!.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }

  String get formattedDriverEarnings {
    return 'TZS ${driverEarnings.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }
}