// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ride_request.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RideRequest _$RideRequestFromJson(Map<String, dynamic> json) => RideRequest(
  id: json['id'] as String,
  customerId: json['customerId'] as String,
  vehicleTypeId: json['vehicleTypeId'] as String?,
  pickupLatitude: (json['pickupLatitude'] as num).toDouble(),
  pickupLongitude: (json['pickupLongitude'] as num).toDouble(),
  pickupAddress: json['pickupAddress'] as String,
  pickupPlaceId: json['pickupPlaceId'] as String?,
  dropoffLatitude: (json['dropoffLatitude'] as num).toDouble(),
  dropoffLongitude: (json['dropoffLongitude'] as num).toDouble(),
  dropoffAddress: json['dropoffAddress'] as String,
  dropoffPlaceId: json['dropoffPlaceId'] as String?,
  scheduledFor: json['scheduledFor'] == null
      ? null
      : DateTime.parse(json['scheduledFor'] as String),
  isScheduled: json['isScheduled'] as bool,
  estimatedDistanceKm: (json['estimatedDistanceKm'] as num?)?.toDouble(),
  estimatedDurationMinutes: (json['estimatedDurationMinutes'] as num?)?.toInt(),
  estimatedFare: (json['estimatedFare'] as num?)?.toInt(),
  surgeMultiplier: (json['surgeMultiplier'] as num).toDouble(),
  promoCodeId: json['promoCodeId'] as String?,
  paymentMethod: $enumDecode(_$PaymentMethodEnumMap, json['paymentMethod']),
  paymentStatus: $enumDecode(_$PaymentStatusEnumMap, json['paymentStatus']),
  status: $enumDecode(_$RideRequestStatusEnumMap, json['status']),
  assignedDriverId: json['assignedDriverId'] as String?,
  assignedAt: json['assignedAt'] == null
      ? null
      : DateTime.parse(json['assignedAt'] as String),
  driverAcceptedAt: json['driverAcceptedAt'] == null
      ? null
      : DateTime.parse(json['driverAcceptedAt'] as String),
  driverArrivedAt: json['driverArrivedAt'] == null
      ? null
      : DateTime.parse(json['driverArrivedAt'] as String),
  rideStartedAt: json['rideStartedAt'] == null
      ? null
      : DateTime.parse(json['rideStartedAt'] as String),
  rideCompletedAt: json['rideCompletedAt'] == null
      ? null
      : DateTime.parse(json['rideCompletedAt'] as String),
  cancelledAt: json['cancelledAt'] == null
      ? null
      : DateTime.parse(json['cancelledAt'] as String),
  cancelledBy: json['cancelledBy'] as String?,
  cancellationReason: json['cancellationReason'] as String?,
  cancellationFee: (json['cancellationFee'] as num).toInt(),
  actualDistanceKm: (json['actualDistanceKm'] as num?)?.toDouble(),
  actualDurationMinutes: (json['actualDurationMinutes'] as num?)?.toInt(),
  actualFare: (json['actualFare'] as num?)?.toInt(),
  platformFee: (json['platformFee'] as num).toInt(),
  driverEarnings: (json['driverEarnings'] as num).toInt(),
  tipAmount: (json['tipAmount'] as num).toInt(),
  rating: (json['rating'] as num?)?.toDouble(),
  feedback: json['feedback'] as String?,
  metadata: json['metadata'] as Map<String, dynamic>,
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$RideRequestToJson(RideRequest instance) =>
    <String, dynamic>{
      'id': instance.id,
      'customerId': instance.customerId,
      'vehicleTypeId': instance.vehicleTypeId,
      'pickupLatitude': instance.pickupLatitude,
      'pickupLongitude': instance.pickupLongitude,
      'pickupAddress': instance.pickupAddress,
      'pickupPlaceId': instance.pickupPlaceId,
      'dropoffLatitude': instance.dropoffLatitude,
      'dropoffLongitude': instance.dropoffLongitude,
      'dropoffAddress': instance.dropoffAddress,
      'dropoffPlaceId': instance.dropoffPlaceId,
      'scheduledFor': instance.scheduledFor?.toIso8601String(),
      'isScheduled': instance.isScheduled,
      'estimatedDistanceKm': instance.estimatedDistanceKm,
      'estimatedDurationMinutes': instance.estimatedDurationMinutes,
      'estimatedFare': instance.estimatedFare,
      'surgeMultiplier': instance.surgeMultiplier,
      'promoCodeId': instance.promoCodeId,
      'paymentMethod': _$PaymentMethodEnumMap[instance.paymentMethod]!,
      'paymentStatus': _$PaymentStatusEnumMap[instance.paymentStatus]!,
      'status': _$RideRequestStatusEnumMap[instance.status]!,
      'assignedDriverId': instance.assignedDriverId,
      'assignedAt': instance.assignedAt?.toIso8601String(),
      'driverAcceptedAt': instance.driverAcceptedAt?.toIso8601String(),
      'driverArrivedAt': instance.driverArrivedAt?.toIso8601String(),
      'rideStartedAt': instance.rideStartedAt?.toIso8601String(),
      'rideCompletedAt': instance.rideCompletedAt?.toIso8601String(),
      'cancelledAt': instance.cancelledAt?.toIso8601String(),
      'cancelledBy': instance.cancelledBy,
      'cancellationReason': instance.cancellationReason,
      'cancellationFee': instance.cancellationFee,
      'actualDistanceKm': instance.actualDistanceKm,
      'actualDurationMinutes': instance.actualDurationMinutes,
      'actualFare': instance.actualFare,
      'platformFee': instance.platformFee,
      'driverEarnings': instance.driverEarnings,
      'tipAmount': instance.tipAmount,
      'rating': instance.rating,
      'feedback': instance.feedback,
      'metadata': instance.metadata,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

const _$PaymentMethodEnumMap = {
  PaymentMethod.wallet: 'wallet',
  PaymentMethod.cash: 'cash',
  PaymentMethod.card: 'card',
  PaymentMethod.pesapal: 'pesapal',
  PaymentMethod.mpesa: 'mpesa',
  PaymentMethod.airtelMoney: 'airtel_money',
  PaymentMethod.halopesa: 'halopesa',
  PaymentMethod.tigopesa: 'tigopesa',
  PaymentMethod.selcom: 'selcom',
};

const _$PaymentStatusEnumMap = {
  PaymentStatus.pending: 'pending',
  PaymentStatus.paid: 'paid',
  PaymentStatus.failed: 'failed',
  PaymentStatus.refunded: 'refunded',
  PaymentStatus.partial: 'partial',
};

const _$RideRequestStatusEnumMap = {
  RideRequestStatus.searching: 'searching',
  RideRequestStatus.driverAssigned: 'driver_assigned',
  RideRequestStatus.driverEnRoute: 'driver_en_route',
  RideRequestStatus.driverArrived: 'driver_arrived',
  RideRequestStatus.inProgress: 'in_progress',
  RideRequestStatus.completed: 'completed',
  RideRequestStatus.cancelled: 'cancelled',
  RideRequestStatus.expired: 'expired',
  RideRequestStatus.noDriversFound: 'no_drivers_found',
};
