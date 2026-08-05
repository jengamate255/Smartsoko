import 'package:json_annotation/json_annotation.dart';

part 'ride_request.g.dart';

enum RideRequestStatus {
  @JsonValue('searching')
  searching,
  @JsonValue('driver_assigned')
  driverAssigned,
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
  @JsonValue('expired')
  expired,
  @JsonValue('no_drivers_found')
  noDriversFound,
}

enum PaymentMethod {
  @JsonValue('wallet')
  wallet,
  @JsonValue('cash')
  cash,
  @JsonValue('card')
  card,
  @JsonValue('pesapal')
  pesapal,
  @JsonValue('mpesa')
  mpesa,
  @JsonValue('airtel_money')
  airtelMoney,
  @JsonValue('halopesa')
  halopesa,
  @JsonValue('tigopesa')
  tigopesa,
  @JsonValue('selcom')
  selcom,
}

enum PaymentStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('paid')
  paid,
  @JsonValue('failed')
  failed,
  @JsonValue('refunded')
  refunded,
  @JsonValue('partial')
  partial,
}

@JsonSerializable()
class RideRequest {
  final String id;
  final String customerId;
  final String? vehicleTypeId;
  final double pickupLatitude;
  final double pickupLongitude;
  final String pickupAddress;
  final String? pickupPlaceId;
  final double dropoffLatitude;
  final double dropoffLongitude;
  final String dropoffAddress;
  final String? dropoffPlaceId;
  final DateTime? scheduledFor;
  final bool isScheduled;
  final double? estimatedDistanceKm;
  final int? estimatedDurationMinutes;
  final int? estimatedFare;
  final double surgeMultiplier;
  final String? promoCodeId;
  final PaymentMethod paymentMethod;
  final PaymentStatus paymentStatus;
  final RideRequestStatus status;
  final String? assignedDriverId;
  final DateTime? assignedAt;
  final DateTime? driverAcceptedAt;
  final DateTime? driverArrivedAt;
  final DateTime? rideStartedAt;
  final DateTime? rideCompletedAt;
  final DateTime? cancelledAt;
  final String? cancelledBy;
  final String? cancellationReason;
  final int cancellationFee;
  final double? actualDistanceKm;
  final int? actualDurationMinutes;
  final int? actualFare;
  final int platformFee;
  final int driverEarnings;
  final int tipAmount;
  final double? rating;
  final String? feedback;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  RideRequest({
    required this.id,
    required this.customerId,
    this.vehicleTypeId,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.pickupAddress,
    this.pickupPlaceId,
    required this.dropoffLatitude,
    required this.dropoffLongitude,
    required this.dropoffAddress,
    this.dropoffPlaceId,
    this.scheduledFor,
    required this.isScheduled,
    this.estimatedDistanceKm,
    this.estimatedDurationMinutes,
    this.estimatedFare,
    required this.surgeMultiplier,
    this.promoCodeId,
    required this.paymentMethod,
    required this.paymentStatus,
    required this.status,
    this.assignedDriverId,
    this.assignedAt,
    this.driverAcceptedAt,
    this.driverArrivedAt,
    this.rideStartedAt,
    this.rideCompletedAt,
    this.cancelledAt,
    this.cancelledBy,
    this.cancellationReason,
    required this.cancellationFee,
    this.actualDistanceKm,
    this.actualDurationMinutes,
    this.actualFare,
    required this.platformFee,
    required this.driverEarnings,
    required this.tipAmount,
    this.rating,
    this.feedback,
    required this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory RideRequest.fromJson(Map<String, dynamic> json) => _$RideRequestFromJson(json);
  Map<String, dynamic> toJson() => _$RideRequestToJson(this);

  // Convenience getters
  bool get isActive => [
    RideRequestStatus.searching,
    RideRequestStatus.driverAssigned,
    RideRequestStatus.driverEnRoute,
    RideRequestStatus.driverArrived,
    RideRequestStatus.inProgress,
  ].contains(status);

  bool get canCancel => [
    RideRequestStatus.searching,
    RideRequestStatus.driverAssigned,
    RideRequestStatus.driverEnRoute,
    RideRequestStatus.driverArrived,
  ].contains(status);

  bool get isCompleted => status == RideRequestStatus.completed;
  bool get isCancelled => status == RideRequestStatus.cancelled;
  bool get isSearching => status == RideRequestStatus.searching;
  bool get hasDriver => assignedDriverId != null;

  String get statusDisplayName {
    switch (status) {
      case RideRequestStatus.searching:
        return 'Searching for driver...';
      case RideRequestStatus.driverAssigned:
        return 'Driver assigned';
      case RideRequestStatus.driverEnRoute:
        return 'Driver on the way';
      case RideRequestStatus.driverArrived:
        return 'Driver arrived';
      case RideRequestStatus.inProgress:
        return 'Ride in progress';
      case RideRequestStatus.completed:
        return 'Completed';
      case RideRequestStatus.cancelled:
        return 'Cancelled';
      case RideRequestStatus.expired:
        return 'Expired';
      case RideRequestStatus.noDriversFound:
        return 'No drivers found';
    }
  }

  String get paymentMethodDisplayName {
    switch (paymentMethod) {
      case PaymentMethod.wallet:
        return 'SmartWallet';
      case PaymentMethod.cash:
        return 'Cash';
      case PaymentMethod.card:
        return 'Card';
      case PaymentMethod.pesapal:
        return 'PesaPal';
      case PaymentMethod.mpesa:
        return 'M-Pesa';
      case PaymentMethod.airtelMoney:
        return 'Airtel Money';
      case PaymentMethod.halopesa:
        return 'HaloPesa';
      case PaymentMethod.tigopesa:
        return 'Tigo Pesa';
      case PaymentMethod.selcom:
        return 'Selcom';
    }
  }
}

// RideStop class is defined in ride_stop.dart