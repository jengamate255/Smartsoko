// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'vehicle_type.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

VehicleType _$VehicleTypeFromJson(Map<String, dynamic> json) => VehicleType(
  id: json['id'] as String,
  name: json['name'] as String,
  displayName: json['displayName'] as String,
  description: json['description'] as String?,
  iconUrl: json['iconUrl'] as String?,
  baseFare: (json['baseFare'] as num).toInt(),
  perKmRate: (json['perKmRate'] as num).toInt(),
  perMinuteRate: (json['perMinuteRate'] as num).toInt(),
  minFare: (json['minFare'] as num).toInt(),
  maxPassengers: (json['maxPassengers'] as num).toInt(),
  hasAc: json['hasAc'] as bool,
  hasTrunk: json['hasTrunk'] as bool,
  isActive: json['isActive'] as bool,
  sortOrder: (json['sortOrder'] as num).toInt(),
  metadata: json['metadata'] as Map<String, dynamic>,
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$VehicleTypeToJson(VehicleType instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'displayName': instance.displayName,
      'description': instance.description,
      'iconUrl': instance.iconUrl,
      'baseFare': instance.baseFare,
      'perKmRate': instance.perKmRate,
      'perMinuteRate': instance.perMinuteRate,
      'minFare': instance.minFare,
      'maxPassengers': instance.maxPassengers,
      'hasAc': instance.hasAc,
      'hasTrunk': instance.hasTrunk,
      'isActive': instance.isActive,
      'sortOrder': instance.sortOrder,
      'metadata': instance.metadata,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };
