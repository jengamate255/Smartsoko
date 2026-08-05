// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'promo_code.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

RidePromotion _$RidePromotionFromJson(Map<String, dynamic> json) =>
    RidePromotion(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      discountType: $enumDecode(
        _$PromoDiscountTypeEnumMap,
        json['discountType'],
      ),
      discountValue: (json['discountValue'] as num).toInt(),
      maxDiscount: (json['maxDiscount'] as num?)?.toInt(),
      minFare: (json['minFare'] as num).toInt(),
      usageLimit: (json['usageLimit'] as num?)?.toInt(),
      usageCount: (json['usageCount'] as num).toInt(),
      usagePerCustomer: (json['usagePerCustomer'] as num).toInt(),
      validFrom: DateTime.parse(json['validFrom'] as String),
      validUntil: json['validUntil'] == null
          ? null
          : DateTime.parse(json['validUntil'] as String),
      applicableVehicleTypes: (json['applicableVehicleTypes'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      applicableZones: (json['applicableZones'] as List<dynamic>)
          .map((e) => e as String)
          .toList(),
      isActive: json['isActive'] as bool,
      isFirstRideOnly: json['isFirstRideOnly'] as bool,
      metadata: json['metadata'] as Map<String, dynamic>,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$RidePromotionToJson(RidePromotion instance) =>
    <String, dynamic>{
      'id': instance.id,
      'code': instance.code,
      'name': instance.name,
      'description': instance.description,
      'discountType': _$PromoDiscountTypeEnumMap[instance.discountType]!,
      'discountValue': instance.discountValue,
      'maxDiscount': instance.maxDiscount,
      'minFare': instance.minFare,
      'usageLimit': instance.usageLimit,
      'usageCount': instance.usageCount,
      'usagePerCustomer': instance.usagePerCustomer,
      'validFrom': instance.validFrom.toIso8601String(),
      'validUntil': instance.validUntil?.toIso8601String(),
      'applicableVehicleTypes': instance.applicableVehicleTypes,
      'applicableZones': instance.applicableZones,
      'isActive': instance.isActive,
      'isFirstRideOnly': instance.isFirstRideOnly,
      'metadata': instance.metadata,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

const _$PromoDiscountTypeEnumMap = {
  PromoDiscountType.percentage: 'percentage',
  PromoDiscountType.fixedAmount: 'fixed_amount',
  PromoDiscountType.freeRide: 'free_ride',
};

CustomerPromotionUsage _$CustomerPromotionUsageFromJson(
  Map<String, dynamic> json,
) => CustomerPromotionUsage(
  id: json['id'] as String,
  customerId: json['customerId'] as String,
  promotionId: json['promotionId'] as String,
  rideRequestId: json['rideRequestId'] as String?,
  usedAt: DateTime.parse(json['usedAt'] as String),
  discountApplied: (json['discountApplied'] as num).toInt(),
);

Map<String, dynamic> _$CustomerPromotionUsageToJson(
  CustomerPromotionUsage instance,
) => <String, dynamic>{
  'id': instance.id,
  'customerId': instance.customerId,
  'promotionId': instance.promotionId,
  'rideRequestId': instance.rideRequestId,
  'usedAt': instance.usedAt.toIso8601String(),
  'discountApplied': instance.discountApplied,
};

PromoValidationResult _$PromoValidationResultFromJson(
  Map<String, dynamic> json,
) => PromoValidationResult(
  valid: json['valid'] as bool,
  error: json['error'] as String?,
  promotion: json['promotion'] == null
      ? null
      : RidePromotion.fromJson(json['promotion'] as Map<String, dynamic>),
  discountAmount: (json['discountAmount'] as num).toInt(),
);

Map<String, dynamic> _$PromoValidationResultToJson(
  PromoValidationResult instance,
) => <String, dynamic>{
  'valid': instance.valid,
  'error': instance.error,
  'promotion': instance.promotion,
  'discountAmount': instance.discountAmount,
};
