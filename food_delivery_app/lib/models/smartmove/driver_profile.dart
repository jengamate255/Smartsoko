import 'package:json_annotation/json_annotation.dart';

part 'driver_profile.g.dart';

enum DriverStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('approved')
  approved,
  @JsonValue('rejected')
  rejected,
  @JsonValue('suspended')
  suspended,
  @JsonValue('deactivated')
  deactivated,
}

enum BackgroundCheckStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('passed')
  passed,
  @JsonValue('failed')
  failed,
  @JsonValue('expired')
  expired,
}

@JsonSerializable()
class DriverProfile {
  final String id;
  final String userId;
  final String licenseNumber;
  final DateTime licenseExpiry;
  final String? licenseImageUrl;
  final String? badgeNumber;
  final DateTime? badgeExpiry;
  final String? vehicleTypeId;
  final String? vehicleMake;
  final String? vehicleModel;
  final int? vehicleYear;
  final String? vehicleColor;
  final String? vehiclePlate;
  final String? vehicleImageUrl;
  final String? vehicleRegistrationUrl;
  final String? vehicleInsuranceUrl;
  final String? vehicleInspectionUrl;
  final DriverStatus status;
  final bool isOnline;
  final double? currentLatitude;
  final double? currentLongitude;
  final double? currentHeading;
  final DateTime? lastLocationUpdate;
  final String? currentZoneId;
  final double rating;
  final int totalRatings;
  final int totalRides;
  final int completedRides;
  final int cancelledRides;
  final double acceptanceRate;
  final double cancellationRate;
  final bool isPriorityDriver;
  final bool isCorporateDriver;
  final List<String> preferredZones;
  final int maxDistanceFromZone;
  final bool documentsVerified;
  final bool vehicleVerified;
  final BackgroundCheckStatus backgroundCheckStatus;
  final DateTime? backgroundCheckDate;
  final DateTime? approvedAt;
  final String? approvedBy;
  final String? rejectionReason;
  final String? suspensionReason;
  final DateTime? suspendedAt;
  final String? suspendedBy;
  final DateTime createdAt;
  final DateTime updatedAt;

  DriverProfile({
    required this.id,
    required this.userId,
    required this.licenseNumber,
    required this.licenseExpiry,
    this.licenseImageUrl,
    this.badgeNumber,
    this.badgeExpiry,
    this.vehicleTypeId,
    this.vehicleMake,
    this.vehicleModel,
    this.vehicleYear,
    this.vehicleColor,
    this.vehiclePlate,
    this.vehicleImageUrl,
    this.vehicleRegistrationUrl,
    this.vehicleInsuranceUrl,
    this.vehicleInspectionUrl,
    required this.status,
    required this.isOnline,
    this.currentLatitude,
    this.currentLongitude,
    this.currentHeading,
    this.lastLocationUpdate,
    this.currentZoneId,
    required this.rating,
    required this.totalRatings,
    required this.totalRides,
    required this.completedRides,
    required this.cancelledRides,
    required this.acceptanceRate,
    required this.cancellationRate,
    required this.isPriorityDriver,
    required this.isCorporateDriver,
    required this.preferredZones,
    required this.maxDistanceFromZone,
    required this.documentsVerified,
    required this.vehicleVerified,
    required this.backgroundCheckStatus,
    this.backgroundCheckDate,
    this.approvedAt,
    this.approvedBy,
    this.rejectionReason,
    this.suspensionReason,
    this.suspendedAt,
    this.suspendedBy,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DriverProfile.fromJson(Map<String, dynamic> json) => _$DriverProfileFromJson(json);
  Map<String, dynamic> toJson() => _$DriverProfileToJson(this);

  DriverProfile copyWith({
    String? id,
    String? userId,
    String? licenseNumber,
    DateTime? licenseExpiry,
    String? licenseImageUrl,
    String? badgeNumber,
    DateTime? badgeExpiry,
    String? vehicleTypeId,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
    String? vehicleImageUrl,
    String? vehicleRegistrationUrl,
    String? vehicleInsuranceUrl,
    String? vehicleInspectionUrl,
    DriverStatus? status,
    bool? isOnline,
    double? currentLatitude,
    double? currentLongitude,
    double? currentHeading,
    DateTime? lastLocationUpdate,
    String? currentZoneId,
    double? rating,
    int? totalRatings,
    int? totalRides,
    int? completedRides,
    int? cancelledRides,
    double? acceptanceRate,
    double? cancellationRate,
    bool? isPriorityDriver,
    bool? isCorporateDriver,
    List<String>? preferredZones,
    int? maxDistanceFromZone,
    bool? documentsVerified,
    bool? vehicleVerified,
    BackgroundCheckStatus? backgroundCheckStatus,
    DateTime? backgroundCheckDate,
    DateTime? approvedAt,
    String? approvedBy,
    String? rejectionReason,
    String? suspensionReason,
    DateTime? suspendedAt,
    String? suspendedBy,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return DriverProfile(
      id: id ?? this.id,
      userId: userId ?? this.userId,
      licenseNumber: licenseNumber ?? this.licenseNumber,
      licenseExpiry: licenseExpiry ?? this.licenseExpiry,
      licenseImageUrl: licenseImageUrl ?? this.licenseImageUrl,
      badgeNumber: badgeNumber ?? this.badgeNumber,
      badgeExpiry: badgeExpiry ?? this.badgeExpiry,
      vehicleTypeId: vehicleTypeId ?? this.vehicleTypeId,
      vehicleMake: vehicleMake ?? this.vehicleMake,
      vehicleModel: vehicleModel ?? this.vehicleModel,
      vehicleYear: vehicleYear ?? this.vehicleYear,
      vehicleColor: vehicleColor ?? this.vehicleColor,
      vehiclePlate: vehiclePlate ?? this.vehiclePlate,
      vehicleImageUrl: vehicleImageUrl ?? this.vehicleImageUrl,
      vehicleRegistrationUrl: vehicleRegistrationUrl ?? this.vehicleRegistrationUrl,
      vehicleInsuranceUrl: vehicleInsuranceUrl ?? this.vehicleInsuranceUrl,
      vehicleInspectionUrl: vehicleInspectionUrl ?? this.vehicleInspectionUrl,
      status: status ?? this.status,
      isOnline: isOnline ?? this.isOnline,
      currentLatitude: currentLatitude ?? this.currentLatitude,
      currentLongitude: currentLongitude ?? this.currentLongitude,
      currentHeading: currentHeading ?? this.currentHeading,
      lastLocationUpdate: lastLocationUpdate ?? this.lastLocationUpdate,
      currentZoneId: currentZoneId ?? this.currentZoneId,
      rating: rating ?? this.rating,
      totalRatings: totalRatings ?? this.totalRatings,
      totalRides: totalRides ?? this.totalRides,
      completedRides: completedRides ?? this.completedRides,
      cancelledRides: cancelledRides ?? this.cancelledRides,
      acceptanceRate: acceptanceRate ?? this.acceptanceRate,
      cancellationRate: cancellationRate ?? this.cancellationRate,
      isPriorityDriver: isPriorityDriver ?? this.isPriorityDriver,
      isCorporateDriver: isCorporateDriver ?? this.isCorporateDriver,
      preferredZones: preferredZones ?? this.preferredZones,
      maxDistanceFromZone: maxDistanceFromZone ?? this.maxDistanceFromZone,
      documentsVerified: documentsVerified ?? this.documentsVerified,
      vehicleVerified: vehicleVerified ?? this.vehicleVerified,
      backgroundCheckStatus: backgroundCheckStatus ?? this.backgroundCheckStatus,
      backgroundCheckDate: backgroundCheckDate ?? this.backgroundCheckDate,
      approvedAt: approvedAt ?? this.approvedAt,
      approvedBy: approvedBy ?? this.approvedBy,
      rejectionReason: rejectionReason ?? this.rejectionReason,
      suspensionReason: suspensionReason ?? this.suspensionReason,
      suspendedAt: suspendedAt ?? this.suspendedAt,
      suspendedBy: suspendedBy ?? this.suspendedBy,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  // Convenience getters
  bool get isApproved => status == DriverStatus.approved;
  bool get isAvailable => isApproved && isOnline;
  bool get hasActiveRide => false; // Would check rides table

  String get vehicleDisplayName {
    final parts = <String>[];
    if (vehicleMake != null) parts.add(vehicleMake!);
    if (vehicleModel != null) parts.add(vehicleModel!);
    if (vehicleYear != null) parts.add(vehicleYear.toString());
    return parts.isEmpty ? 'Unknown vehicle' : parts.join(' ');
  }

  String get vehiclePlateDisplay => vehiclePlate ?? 'No plate';

  bool get isLicenseExpired => licenseExpiry.isBefore(DateTime.now());
  bool get isBadgeExpired => badgeExpiry?.isBefore(DateTime.now()) ?? false;

  String get statusDisplayName {
    switch (status) {
      case DriverStatus.pending:
        return 'Pending Approval';
      case DriverStatus.approved:
        return 'Active';
      case DriverStatus.rejected:
        return 'Rejected';
      case DriverStatus.suspended:
        return 'Suspended';
      case DriverStatus.deactivated:
        return 'Deactivated';
    }
  }

  String get completionRate {
    if (totalRides == 0) return '0%';
    return '${(completedRides / totalRides * 100).toStringAsFixed(1)}%';
  }
}