// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ride.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

Ride _$RideFromJson(Map<String, dynamic> json) => Ride(
  id: json['id'] as String,
  rideRequestId: json['rideRequestId'] as String,
  customerId: json['customerId'] as String,
  driverId: json['driverId'] as String,
  vehicleTypeId: json['vehicleTypeId'] as String?,
  status: $enumDecode(_$RideStatusEnumMap, json['status']),
  pickupLatitude: (json['pickupLatitude'] as num).toDouble(),
  pickupLongitude: (json['pickupLongitude'] as num).toDouble(),
  pickupAddress: json['pickupAddress'] as String,
  dropoffLatitude: (json['dropoffLatitude'] as num).toDouble(),
  dropoffLongitude: (json['dropoffLongitude'] as num).toDouble(),
  dropoffAddress: json['dropoffAddress'] as String,
  scheduledFor: json['scheduledFor'] == null
      ? null
      : DateTime.parse(json['scheduledFor'] as String),
  startedAt: json['startedAt'] == null
      ? null
      : DateTime.parse(json['startedAt'] as String),
  completedAt: json['completedAt'] == null
      ? null
      : DateTime.parse(json['completedAt'] as String),
  cancelledAt: json['cancelledAt'] == null
      ? null
      : DateTime.parse(json['cancelledAt'] as String),
  cancelledBy: json['cancelledBy'] as String?,
  cancellationReason: json['cancellationReason'] as String?,
  actualDistanceKm: (json['actualDistanceKm'] as num?)?.toDouble(),
  actualDurationMinutes: (json['actualDurationMinutes'] as num?)?.toInt(),
  routeGeometry: json['routeGeometry'] as Map<String, dynamic>?,
  routeDistanceKm: (json['routeDistanceKm'] as num?)?.toDouble(),
  routeDurationMinutes: (json['routeDurationMinutes'] as num?)?.toInt(),
  fareBreakdown: json['fareBreakdown'] as Map<String, dynamic>,
  totalFare: (json['totalFare'] as num?)?.toInt(),
  platformFee: (json['platformFee'] as num).toInt(),
  driverEarnings: (json['driverEarnings'] as num).toInt(),
  tipAmount: (json['tipAmount'] as num).toInt(),
  paymentStatus: json['paymentStatus'] as String?,
  paymentMethod: json['paymentMethod'] as String?,
  transactionId: json['transactionId'] as String?,
  customerRating: (json['customerRating'] as num?)?.toDouble(),
  customerFeedback: json['customerFeedback'] as String?,
  driverRating: (json['driverRating'] as num?)?.toDouble(),
  driverFeedback: json['driverFeedback'] as String?,
  metadata: json['metadata'] as Map<String, dynamic>,
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$RideToJson(Ride instance) => <String, dynamic>{
  'id': instance.id,
  'rideRequestId': instance.rideRequestId,
  'customerId': instance.customerId,
  'driverId': instance.driverId,
  'vehicleTypeId': instance.vehicleTypeId,
  'status': _$RideStatusEnumMap[instance.status]!,
  'pickupLatitude': instance.pickupLatitude,
  'pickupLongitude': instance.pickupLongitude,
  'pickupAddress': instance.pickupAddress,
  'dropoffLatitude': instance.dropoffLatitude,
  'dropoffLongitude': instance.dropoffLongitude,
  'dropoffAddress': instance.dropoffAddress,
  'scheduledFor': instance.scheduledFor?.toIso8601String(),
  'startedAt': instance.startedAt?.toIso8601String(),
  'completedAt': instance.completedAt?.toIso8601String(),
  'cancelledAt': instance.cancelledAt?.toIso8601String(),
  'cancelledBy': instance.cancelledBy,
  'cancellationReason': instance.cancellationReason,
  'actualDistanceKm': instance.actualDistanceKm,
  'actualDurationMinutes': instance.actualDurationMinutes,
  'routeGeometry': instance.routeGeometry,
  'routeDistanceKm': instance.routeDistanceKm,
  'routeDurationMinutes': instance.routeDurationMinutes,
  'fareBreakdown': instance.fareBreakdown,
  'totalFare': instance.totalFare,
  'platformFee': instance.platformFee,
  'driverEarnings': instance.driverEarnings,
  'tipAmount': instance.tipAmount,
  'paymentStatus': instance.paymentStatus,
  'paymentMethod': instance.paymentMethod,
  'transactionId': instance.transactionId,
  'customerRating': instance.customerRating,
  'customerFeedback': instance.customerFeedback,
  'driverRating': instance.driverRating,
  'driverFeedback': instance.driverFeedback,
  'metadata': instance.metadata,
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
};

const _$RideStatusEnumMap = {
  RideStatus.assigned: 'assigned',
  RideStatus.driverEnRoute: 'driver_en_route',
  RideStatus.driverArrived: 'driver_arrived',
  RideStatus.inProgress: 'in_progress',
  RideStatus.completed: 'completed',
  RideStatus.cancelled: 'cancelled',
  RideStatus.disputed: 'disputed',
};
