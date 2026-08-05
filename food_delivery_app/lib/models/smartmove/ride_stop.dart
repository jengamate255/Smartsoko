import 'package:json_annotation/json_annotation.dart';

part 'ride_stop.g.dart';

enum StopType {
  @JsonValue('pickup')
  pickup,
  @JsonValue('dropoff')
  dropoff,
  @JsonValue('via')
  via,
}

@JsonSerializable()
class RideStop {
  final String id;
  final String rideRequestId;
  final int stopOrder;
  final double latitude;
  final double longitude;
  final String address;
  final String? placeId;
  final StopType stopType;
  final DateTime? estimatedArrival;
  final DateTime? actualArrival;
  final bool isCompleted;
  final DateTime createdAt;

  RideStop({
    required this.id,
    required this.rideRequestId,
    required this.stopOrder,
    required this.latitude,
    required this.longitude,
    required this.address,
    this.placeId,
    required this.stopType,
    this.estimatedArrival,
    this.actualArrival,
    required this.isCompleted,
    required this.createdAt,
  });

  factory RideStop.fromJson(Map<String, dynamic> json) => _$RideStopFromJson(json);
  Map<String, dynamic> toJson() => _$RideStopToJson(this);

  String get stopTypeDisplayName {
    switch (stopType) {
      case StopType.pickup:
        return 'Pickup';
      case StopType.dropoff:
        return 'Drop-off';
      case StopType.via:
        return 'Via';
    }
  }
}