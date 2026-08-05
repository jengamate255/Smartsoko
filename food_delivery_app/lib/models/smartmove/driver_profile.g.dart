// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'driver_profile.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

DriverProfile _$DriverProfileFromJson(Map<String, dynamic> json) =>
    DriverProfile(
      id: json['id'] as String,
      userId: json['userId'] as String,
      licenseNumber: json['licenseNumber'] as String,
      licenseExpiry: DateTime.parse(json['licenseExpiry'] as String),
      licenseImageUrl: json['licenseImageUrl'] as String?,
      badgeNumber: json['badgeNumber'] as String?,
      badgeExpiry: json['badgeExpiry'] == null
          ? null
          : DateTime.parse(json['badgeExpiry'] as String),
      vehicleTypeId: json['vehicleTypeId'] as String?,
      vehicleMake: json['vehicleMake'] as String?,
      vehicleModel: json['vehicleModel'] as String?,
      vehicleYear: (json['vehicleYear'] as num?)?.toInt(),
      vehicleColor: json['vehicleColor'] as String?,
      vehiclePlate: json['vehiclePlate'] as String?,
      vehicleImageUrl: json['vehicleImageUrl'] as String?,
      vehicleRegistrationUrl: json['vehicleRegistrationUrl'] as String?,
      vehicleInsuranceUrl: json['vehicleInsuranceUrl'] as String?,
      vehicleInspectionUrl: json['vehicleInspectionUrl'] as String?,
      status: $enumDecode(_$DriverStatusEnumMap, json['status']),
      isOnline: json['isOnline'] as bool,
      currentLatitude: (json['currentLatitude'] as num?)?.toDouble(),
      currentLongitude: (json['currentLongitude'] as num?)?.toDouble(),
      currentHeading: (json['currentHeading'] as num?)?.toDouble(),
      lastLocationUpdate: json['lastLocationUpdate'] == null
          ? null
          : DateTime.parse(json['lastLocationUpdate'] as String),
      currentZoneId: json['currentZoneId'] as String?,
      rating: (json['rating'] as num).toDouble(),
      totalRatings: (json['totalRatings'] as num).toInt(),
      totalRides: (json['totalRides'] as num).toInt(),
      completedRides: (json['completedRides'] as num).toInt(),
      cancelledRides: (json['cancelledRides'] as num).toInt(),
      acceptanceRate: (json['acceptanceRate'] as num).toDouble(),
      cancellationRate: (json['cancellationRate'] as num).toDouble(),
      isPriorityDriver: json['isPriorityDriver'] as bool,
      isCorporateDriver: json['isCorporateDriver'] as bool,
      preferredZones: (json['preferredZones'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      maxDistanceFromZone: (json['maxDistanceFromZone'] as num).toInt(),
      documentsVerified: json['documentsVerified'] as bool,
      vehicleVerified: json['vehicleVerified'] as bool,
      backgroundCheckStatus: $enumDecode(
        _$BackgroundCheckStatusEnumMap,
        json['backgroundCheckStatus'],
      ),
      backgroundCheckDate: json['backgroundCheckDate'] == null
          ? null
          : DateTime.parse(json['backgroundCheckDate'] as String),
      approvedAt: json['approvedAt'] == null
          ? null
          : DateTime.parse(json['approvedAt'] as String),
      approvedBy: json['approvedBy'] as String?,
      rejectionReason: json['rejectionReason'] as String?,
      suspensionReason: json['suspensionReason'] as String?,
      suspendedAt: json['suspendedAt'] == null
          ? null
          : DateTime.parse(json['suspendedAt'] as String),
      suspendedBy: json['suspendedBy'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$DriverProfileToJson(DriverProfile instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'licenseNumber': instance.licenseNumber,
      'licenseExpiry': instance.licenseExpiry.toIso8601String(),
      'licenseImageUrl': instance.licenseImageUrl,
      'badgeNumber': instance.badgeNumber,
      'badgeExpiry': instance.badgeExpiry?.toIso8601String(),
      'vehicleTypeId': instance.vehicleTypeId,
      'vehicleMake': instance.vehicleMake,
      'vehicleModel': instance.vehicleModel,
      'vehicleYear': instance.vehicleYear,
      'vehicleColor': instance.vehicleColor,
      'vehiclePlate': instance.vehiclePlate,
      'vehicleImageUrl': instance.vehicleImageUrl,
      'vehicleRegistrationUrl': instance.vehicleRegistrationUrl,
      'vehicleInsuranceUrl': instance.vehicleInsuranceUrl,
      'vehicleInspectionUrl': instance.vehicleInspectionUrl,
      'status': _$DriverStatusEnumMap[instance.status]!,
      'isOnline': instance.isOnline,
      'currentLatitude': instance.currentLatitude,
      'currentLongitude': instance.currentLongitude,
      'currentHeading': instance.currentHeading,
      'lastLocationUpdate': instance.lastLocationUpdate?.toIso8601String(),
      'currentZoneId': instance.currentZoneId,
      'rating': instance.rating,
      'totalRatings': instance.totalRatings,
      'totalRides': instance.totalRides,
      'completedRides': instance.completedRides,
      'cancelledRides': instance.cancelledRides,
      'acceptanceRate': instance.acceptanceRate,
      'cancellationRate': instance.cancellationRate,
      'isPriorityDriver': instance.isPriorityDriver,
      'isCorporateDriver': instance.isCorporateDriver,
      'preferredZones': instance.preferredZones,
      'maxDistanceFromZone': instance.maxDistanceFromZone,
      'documentsVerified': instance.documentsVerified,
      'vehicleVerified': instance.vehicleVerified,
      'backgroundCheckStatus':
          _$BackgroundCheckStatusEnumMap[instance.backgroundCheckStatus]!,
      'backgroundCheckDate': instance.backgroundCheckDate?.toIso8601String(),
      'approvedAt': instance.approvedAt?.toIso8601String(),
      'approvedBy': instance.approvedBy,
      'rejectionReason': instance.rejectionReason,
      'suspensionReason': instance.suspensionReason,
      'suspendedAt': instance.suspendedAt?.toIso8601String(),
      'suspendedBy': instance.suspendedBy,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

const _$DriverStatusEnumMap = {
  DriverStatus.pending: 'pending',
  DriverStatus.approved: 'approved',
  DriverStatus.rejected: 'rejected',
  DriverStatus.suspended: 'suspended',
  DriverStatus.deactivated: 'deactivated',
};

const _$BackgroundCheckStatusEnumMap = {
  BackgroundCheckStatus.pending: 'pending',
  BackgroundCheckStatus.passed: 'passed',
  BackgroundCheckStatus.failed: 'failed',
  BackgroundCheckStatus.expired: 'expired',
};
