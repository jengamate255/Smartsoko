// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ride_stop.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RideStop _$RideStopFromJson(Map<String, dynamic> json) => RideStop(
  id: json['id'] as String,
  rideRequestId: json['rideRequestId'] as String,
  stopOrder: (json['stopOrder'] as num).toInt(),
  latitude: (json['latitude'] as num).toDouble(),
  longitude: (json['longitude'] as num).toDouble(),
  address: json['address'] as String,
  placeId: json['placeId'] as String?,
  stopType: $enumDecode(_$StopTypeEnumMap, json['stopType']),
  estimatedArrival: json['estimatedArrival'] == null
      ? null
      : DateTime.parse(json['estimatedArrival'] as String),
  actualArrival: json['actualArrival'] == null
      ? null
      : DateTime.parse(json['actualArrival'] as String),
  isCompleted: json['isCompleted'] as bool,
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$RideStopToJson(RideStop instance) => <String, dynamic>{
  'id': instance.id,
  'rideRequestId': instance.rideRequestId,
  'stopOrder': instance.stopOrder,
  'latitude': instance.latitude,
  'longitude': instance.longitude,
  'address': instance.address,
  'placeId': instance.placeId,
  'stopType': _$StopTypeEnumMap[instance.stopType]!,
  'estimatedArrival': instance.estimatedArrival?.toIso8601String(),
  'actualArrival': instance.actualArrival?.toIso8601String(),
  'isCompleted': instance.isCompleted,
  'createdAt': instance.createdAt.toIso8601String(),
};

const _$StopTypeEnumMap = {
  StopType.pickup: 'pickup',
  StopType.dropoff: 'dropoff',
  StopType.via: 'via',
};
