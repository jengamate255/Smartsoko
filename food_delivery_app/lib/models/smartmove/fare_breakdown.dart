import 'package:json_annotation/json_annotation.dart';

part 'fare_breakdown.g.dart';

@JsonSerializable()
class FareBreakdown {
  final int baseFare;
  final int distanceFare;
  final int timeFare;
  final int waitingFare;
  final int airportFee;
  final int nightSurcharge;
  final int peakSurcharge;
  final int promoDiscount;
  final int subtotal;
  final int platformFee;
  final int totalFare;
  final double surgeMultiplier;
  final double estimatedDistanceKm;
  final int estimatedDurationMinutes;

  FareBreakdown({
    required this.baseFare,
    required this.distanceFare,
    required this.timeFare,
    required this.waitingFare,
    required this.airportFee,
    required this.nightSurcharge,
    required this.peakSurcharge,
    required this.promoDiscount,
    required this.subtotal,
    required this.platformFee,
    required this.totalFare,
    required this.surgeMultiplier,
    required this.estimatedDistanceKm,
    required this.estimatedDurationMinutes,
  });

  factory FareBreakdown.fromJson(Map<String, dynamic> json) => _$FareBreakdownFromJson(json);
  Map<String, dynamic> toJson() => _$FareBreakdownToJson(this);

  // Formatted strings for display
  String get formattedBaseFare => _formatAmount(baseFare);
  String get formattedDistanceFare => _formatAmount(distanceFare);
  String get formattedTimeFare => _formatAmount(timeFare);
  String get formattedWaitingFare => _formatAmount(waitingFare);
  String get formattedAirportFee => _formatAmount(airportFee);
  String get formattedNightSurcharge => _formatAmount(nightSurcharge);
  String get formattedPeakSurcharge => _formatAmount(peakSurcharge);
  String get formattedPromoDiscount => '-${_formatAmount(promoDiscount)}';
  String get formattedSubtotal => _formatAmount(subtotal);
  String get formattedPlatformFee => _formatAmount(platformFee);
  String get formattedTotalFare => _formatAmount(totalFare);
  String get formattedSurgeMultiplier => '${surgeMultiplier.toStringAsFixed(1)}x';
  String get formattedDistance => '${estimatedDistanceKm.toStringAsFixed(1)} km';
  String get formattedDuration => '$estimatedDurationMinutes min';

  int get driverEarnings => totalFare - platformFee;
  String get formattedDriverEarnings => _formatAmount(driverEarnings);

  static String _formatAmount(int amount) {
    final sign = amount < 0 ? '-' : '';
    final absAmount = amount.abs();
    return '$sign TZS ${absAmount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }
}

@JsonSerializable()
class PricingRequest {
  final String vehicleTypeId;
  final double pickupLatitude;
  final double pickupLongitude;
  final double dropoffLatitude;
  final double dropoffLongitude;
  final String? pickupZoneId;
  final String? dropoffZoneId;
  final DateTime? scheduledFor;
  final bool isAirportPickup;
  final bool isAirportDropoff;
  final String? promoCode;
  final String? customerId;
  final double? distanceKm;
  final int? durationMinutes;

  PricingRequest({
    required this.vehicleTypeId,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.dropoffLatitude,
    required this.dropoffLongitude,
    this.pickupZoneId,
    this.dropoffZoneId,
    this.scheduledFor,
    this.isAirportPickup = false,
    this.isAirportDropoff = false,
    this.promoCode,
    this.customerId,
    this.distanceKm,
    this.durationMinutes,
  });

  factory PricingRequest.fromJson(Map<String, dynamic> json) => _$PricingRequestFromJson(json);
  Map<String, dynamic> toJson() => _$PricingRequestToJson(this);
}

@JsonSerializable()
class PricingResponse {
  final bool success;
  final FareBreakdown fareBreakdown;
  final Map<String, dynamic>? routeGeometry;
  final double estimatedDistanceKm;
  final int estimatedDurationMinutes;
  final String? error;

  PricingResponse({
    required this.success,
    required this.fareBreakdown,
    this.routeGeometry,
    required this.estimatedDistanceKm,
    required this.estimatedDurationMinutes,
    this.error,
  });

  factory PricingResponse.fromJson(Map<String, dynamic> json) => _$PricingResponseFromJson(json);
  Map<String, dynamic> toJson() => _$PricingResponseToJson(this);
}