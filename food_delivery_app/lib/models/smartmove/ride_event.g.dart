// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ride_event.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RideEvent _$RideEventFromJson(Map<String, dynamic> json) => RideEvent(
  id: json['id'] as String,
  rideId: json['rideId'] as String,
  eventType: $enumDecode(_$RideEventTypeEnumMap, json['eventType']),
  eventData: json['eventData'] as Map<String, dynamic>,
  triggeredBy: json['triggeredBy'] as String?,
  triggeredByRole: json['triggeredByRole'] as String?,
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$RideEventToJson(RideEvent instance) => <String, dynamic>{
  'id': instance.id,
  'rideId': instance.rideId,
  'eventType': _$RideEventTypeEnumMap[instance.eventType]!,
  'eventData': instance.eventData,
  'triggeredBy': instance.triggeredBy,
  'triggeredByRole': instance.triggeredByRole,
  'createdAt': instance.createdAt.toIso8601String(),
};

const _$RideEventTypeEnumMap = {
  RideEventType.requested: 'requested',
  RideEventType.searchingDriver: 'searching_driver',
  RideEventType.driverAssigned: 'driver_assigned',
  RideEventType.driverAccepted: 'driver_accepted',
  RideEventType.driverRejected: 'driver_rejected',
  RideEventType.driverTimeout: 'driver_timeout',
  RideEventType.driverEnRoute: 'driver_en_route',
  RideEventType.driverArrived: 'driver_arrived',
  RideEventType.rideStarted: 'ride_started',
  RideEventType.ridePaused: 'ride_paused',
  RideEventType.rideResumed: 'ride_resumed',
  RideEventType.rideCompleted: 'ride_completed',
  RideEventType.rideCancelled: 'ride_cancelled',
  RideEventType.paymentInitiated: 'payment_initiated',
  RideEventType.paymentCompleted: 'payment_completed',
  RideEventType.paymentFailed: 'payment_failed',
  RideEventType.refundInitiated: 'refund_initiated',
  RideEventType.refundCompleted: 'refund_completed',
  RideEventType.ratingSubmitted: 'rating_submitted',
  RideEventType.disputeOpened: 'dispute_opened',
  RideEventType.disputeResolved: 'dispute_resolved',
  RideEventType.locationUpdate: 'location_update',
  RideEventType.routeUpdate: 'route_update',
  RideEventType.etaUpdate: 'eta_update',
};
