import 'package:json_annotation/json_annotation.dart';

part 'ride_event.g.dart';

enum RideEventType {
  @JsonValue('requested')
  requested,
  @JsonValue('searching_driver')
  searchingDriver,
  @JsonValue('driver_assigned')
  driverAssigned,
  @JsonValue('driver_accepted')
  driverAccepted,
  @JsonValue('driver_rejected')
  driverRejected,
  @JsonValue('driver_timeout')
  driverTimeout,
  @JsonValue('driver_en_route')
  driverEnRoute,
  @JsonValue('driver_arrived')
  driverArrived,
  @JsonValue('ride_started')
  rideStarted,
  @JsonValue('ride_paused')
  ridePaused,
  @JsonValue('ride_resumed')
  rideResumed,
  @JsonValue('ride_completed')
  rideCompleted,
  @JsonValue('ride_cancelled')
  rideCancelled,
  @JsonValue('payment_initiated')
  paymentInitiated,
  @JsonValue('payment_completed')
  paymentCompleted,
  @JsonValue('payment_failed')
  paymentFailed,
  @JsonValue('refund_initiated')
  refundInitiated,
  @JsonValue('refund_completed')
  refundCompleted,
  @JsonValue('rating_submitted')
  ratingSubmitted,
  @JsonValue('dispute_opened')
  disputeOpened,
  @JsonValue('dispute_resolved')
  disputeResolved,
  @JsonValue('location_update')
  locationUpdate,
  @JsonValue('route_update')
  routeUpdate,
  @JsonValue('eta_update')
  etaUpdate,
}

@JsonSerializable()
class RideEvent {
  final String id;
  final String rideId;
  final RideEventType eventType;
  final Map<String, dynamic> eventData;
  final String? triggeredBy;
  final String? triggeredByRole;
  final DateTime createdAt;

  RideEvent({
    required this.id,
    required this.rideId,
    required this.eventType,
    required this.eventData,
    this.triggeredBy,
    this.triggeredByRole,
    required this.createdAt,
  });

  factory RideEvent.fromJson(Map<String, dynamic> json) => _$RideEventFromJson(json);
  Map<String, dynamic> toJson() => _$RideEventToJson(this);

  String get eventTypeDisplayName {
    switch (eventType) {
      case RideEventType.requested:
        return 'Ride requested';
      case RideEventType.searchingDriver:
        return 'Searching for driver';
      case RideEventType.driverAssigned:
        return 'Driver assigned';
      case RideEventType.driverAccepted:
        return 'Driver accepted';
      case RideEventType.driverRejected:
        return 'Driver rejected';
      case RideEventType.driverTimeout:
        return 'Driver timeout';
      case RideEventType.driverEnRoute:
        return 'Driver en route';
      case RideEventType.driverArrived:
        return 'Driver arrived';
      case RideEventType.rideStarted:
        return 'Ride started';
      case RideEventType.ridePaused:
        return 'Ride paused';
      case RideEventType.rideResumed:
        return 'Ride resumed';
      case RideEventType.rideCompleted:
        return 'Ride completed';
      case RideEventType.rideCancelled:
        return 'Ride cancelled';
      case RideEventType.paymentInitiated:
        return 'Payment initiated';
      case RideEventType.paymentCompleted:
        return 'Payment completed';
      case RideEventType.paymentFailed:
        return 'Payment failed';
      case RideEventType.refundInitiated:
        return 'Refund initiated';
      case RideEventType.refundCompleted:
        return 'Refund completed';
      case RideEventType.ratingSubmitted:
        return 'Rating submitted';
      case RideEventType.disputeOpened:
        return 'Dispute opened';
      case RideEventType.disputeResolved:
        return 'Dispute resolved';
      case RideEventType.locationUpdate:
        return 'Location update';
      case RideEventType.routeUpdate:
        return 'Route update';
      case RideEventType.etaUpdate:
        return 'ETA update';
    }
  }
}