// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'ride_service.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FavoritePlace _$FavoritePlaceFromJson(Map<String, dynamic> json) =>
    FavoritePlace(
      id: json['id'] as String,
      customerId: json['customerId'] as String,
      name: json['name'] as String,
      address: json['address'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      placeId: json['placeId'] as String?,
      placeType: $enumDecode(_$PlaceTypeEnumMap, json['placeType']),
      iconName: json['iconName'] as String?,
      sortOrder: (json['sortOrder'] as num).toInt(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$FavoritePlaceToJson(FavoritePlace instance) =>
    <String, dynamic>{
      'id': instance.id,
      'customerId': instance.customerId,
      'name': instance.name,
      'address': instance.address,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'placeId': instance.placeId,
      'placeType': _$PlaceTypeEnumMap[instance.placeType]!,
      'iconName': instance.iconName,
      'sortOrder': instance.sortOrder,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

const _$PlaceTypeEnumMap = {
  PlaceType.home: 'home',
  PlaceType.work: 'work',
  PlaceType.custom: 'custom',
  PlaceType.airport: 'airport',
  PlaceType.hotel: 'hotel',
  PlaceType.landmark: 'landmark',
};

SavedRoute _$SavedRouteFromJson(Map<String, dynamic> json) => SavedRoute(
  id: json['id'] as String,
  customerId: json['customerId'] as String,
  name: json['name'] as String,
  pickupLatitude: (json['pickupLatitude'] as num).toDouble(),
  pickupLongitude: (json['pickupLongitude'] as num).toDouble(),
  pickupAddress: json['pickupAddress'] as String,
  dropoffLatitude: (json['dropoffLatitude'] as num).toDouble(),
  dropoffLongitude: (json['dropoffLongitude'] as num).toDouble(),
  dropoffAddress: json['dropoffAddress'] as String,
  vehicleTypeId: json['vehicleTypeId'] as String?,
  estimatedFare: (json['estimatedFare'] as num?)?.toInt(),
  estimatedDurationMinutes: (json['estimatedDurationMinutes'] as num?)?.toInt(),
  useCount: (json['useCount'] as num).toInt(),
  lastUsedAt: json['lastUsedAt'] == null
      ? null
      : DateTime.parse(json['lastUsedAt'] as String),
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$SavedRouteToJson(SavedRoute instance) =>
    <String, dynamic>{
      'id': instance.id,
      'customerId': instance.customerId,
      'name': instance.name,
      'pickupLatitude': instance.pickupLatitude,
      'pickupLongitude': instance.pickupLongitude,
      'pickupAddress': instance.pickupAddress,
      'dropoffLatitude': instance.dropoffLatitude,
      'dropoffLongitude': instance.dropoffLongitude,
      'dropoffAddress': instance.dropoffAddress,
      'vehicleTypeId': instance.vehicleTypeId,
      'estimatedFare': instance.estimatedFare,
      'estimatedDurationMinutes': instance.estimatedDurationMinutes,
      'useCount': instance.useCount,
      'lastUsedAt': instance.lastUsedAt?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };
