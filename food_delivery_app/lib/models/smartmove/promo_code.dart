import 'package:json_annotation/json_annotation.dart';

part 'promo_code.g.dart';

enum PromoDiscountType {
  @JsonValue('percentage')
  percentage,
  @JsonValue('fixed_amount')
  fixedAmount,
  @JsonValue('free_ride')
  freeRide,
}

@JsonSerializable()
class RidePromotion {
  final String id;
  final String code;
  final String name;
  final String? description;
  final PromoDiscountType discountType;
  final int discountValue;
  final int? maxDiscount;
  final int minFare;
  final int? usageLimit;
  final int usageCount;
  final int usagePerCustomer;
  final DateTime validFrom;
  final DateTime? validUntil;
  final List<String> applicableVehicleTypes;
  final List<String> applicableZones;
  final bool isActive;
  final bool isFirstRideOnly;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  RidePromotion({
    required this.id,
    required this.code,
    required this.name,
    this.description,
    required this.discountType,
    required this.discountValue,
    this.maxDiscount,
    required this.minFare,
    this.usageLimit,
    required this.usageCount,
    required this.usagePerCustomer,
    required this.validFrom,
    this.validUntil,
    required this.applicableVehicleTypes,
    required this.applicableZones,
    required this.isActive,
    required this.isFirstRideOnly,
    required this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory RidePromotion.fromJson(Map<String, dynamic> json) => _$RidePromotionFromJson(json);
  Map<String, dynamic> toJson() => _$RidePromotionToJson(this);

  bool get isValidNow {
    final now = DateTime.now();
    return isActive &&
           validFrom.isBefore(now) &&
           (validUntil == null || validUntil!.isAfter(now)) &&
           (usageLimit == null || usageCount < usageLimit!);
  }

  int calculateDiscount(int fare) {
    switch (discountType) {
      case PromoDiscountType.percentage:
        final discount = (fare * discountValue / 100).round();
        return maxDiscount != null ? discount.clamp(0, maxDiscount!) : discount;
      case PromoDiscountType.fixedAmount:
        return discountValue.clamp(0, fare);
      case PromoDiscountType.freeRide:
        return fare;
    }
  }
}

@JsonSerializable()
class CustomerPromotionUsage {
  final String id;
  final String customerId;
  final String promotionId;
  final String? rideRequestId;
  final DateTime usedAt;
  final int discountApplied;

  CustomerPromotionUsage({
    required this.id,
    required this.customerId,
    required this.promotionId,
    this.rideRequestId,
    required this.usedAt,
    required this.discountApplied,
  });

  factory CustomerPromotionUsage.fromJson(Map<String, dynamic> json) => _$CustomerPromotionUsageFromJson(json);
  Map<String, dynamic> toJson() => _$CustomerPromotionUsageToJson(this);
}

@JsonSerializable()
class PromoValidationResult {
  final bool valid;
  final String? error;
  final RidePromotion? promotion;
  final int discountAmount;

  PromoValidationResult({
    required this.valid,
    this.error,
    this.promotion,
    required this.discountAmount,
  });

  factory PromoValidationResult.fromJson(Map<String, dynamic> json) => _$PromoValidationResultFromJson(json);
  Map<String, dynamic> toJson() => _$PromoValidationResultToJson(this);
}