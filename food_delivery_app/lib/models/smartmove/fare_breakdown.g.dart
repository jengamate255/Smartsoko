// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'fare_breakdown.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

FareBreakdown _$FareBreakdownFromJson(Map<String, dynamic> json) =>
    FareBreakdown(
      baseFare: (json['baseFare'] as num).toInt(),
      distanceFare: (json['distanceFare'] as num).toInt(),
      timeFare: (json['timeFare'] as num).toInt(),
      waitingFare: (json['waitingFare'] as num).toInt(),
      airportFee: (json['airportFee'] as num).toInt(),
      nightSurcharge: (json['nightSurcharge'] as num).toInt(),
      peakSurcharge: (json['peakSurcharge'] as num).toInt(),
      promoDiscount: (json['promoDiscount'] as num).toInt(),
      subtotal: (json['subtotal'] as num).toInt(),
      platformFee: (json['platformFee'] as num).toInt(),
      totalFare: (json['totalFare'] as num).toInt(),
      surgeMultiplier: (json['surgeMultiplier'] as num).toDouble(),
      estimatedDistanceKm: (json['estimatedDistanceKm'] as num).toDouble(),
      estimatedDurationMinutes: (json['estimatedDurationMinutes'] as num)
          .toInt(),
    );

Map<String, dynamic> _$FareBreakdownToJson(FareBreakdown instance) =>
    <String, dynamic>{
      'baseFare': instance.baseFare,
      'distanceFare': instance.distanceFare,
      'timeFare': instance.timeFare,
      'waitingFare': instance.waitingFare,
      'airportFee': instance.airportFee,
      'nightSurcharge': instance.nightSurcharge,
      'peakSurcharge': instance.peakSurcharge,
      'promoDiscount': instance.promoDiscount,
      'subtotal': instance.subtotal,
      'platformFee': instance.platformFee,
      'totalFare': instance.totalFare,
      'surgeMultiplier': instance.surgeMultiplier,
      'estimatedDistanceKm': instance.estimatedDistanceKm,
      'estimatedDurationMinutes': instance.estimatedDurationMinutes,
    };

PricingRequest _$PricingRequestFromJson(Map<String, dynamic> json) =>
    PricingRequest(
      vehicleTypeId: json['vehicleTypeId'] as String,
      pickupLatitude: (json['pickupLatitude'] as num).toDouble(),
      pickupLongitude: (json['pickupLongitude'] as num).toDouble(),
      dropoffLatitude: (json['dropoffLatitude'] as num).toDouble(),
      dropoffLongitude: (json['dropoffLongitude'] as num).toDouble(),
      pickupZoneId: json['pickupZoneId'] as String?,
      dropoffZoneId: json['dropoffZoneId'] as String?,
      scheduledFor: json['scheduledFor'] == null
          ? null
          : DateTime.parse(json['scheduledFor'] as String),
      isAirportPickup: json['isAirportPickup'] as bool? ?? false,
      isAirportDropoff: json['isAirportDropoff'] as bool? ?? false,
      promoCode: json['promoCode'] as String?,
      customerId: json['customerId'] as String?,
      distanceKm: (json['distanceKm'] as num?)?.toDouble(),
      durationMinutes: (json['durationMinutes'] as num?)?.toInt(),
    );

Map<String, dynamic> _$PricingRequestToJson(PricingRequest instance) =>
    <String, dynamic>{
      'vehicleTypeId': instance.vehicleTypeId,
      'pickupLatitude': instance.pickupLatitude,
      'pickupLongitude': instance.pickupLongitude,
      'dropoffLatitude': instance.dropoffLatitude,
      'dropoffLongitude': instance.dropoffLongitude,
      'pickupZoneId': instance.pickupZoneId,
      'dropoffZoneId': instance.dropoffZoneId,
      'scheduledFor': instance.scheduledFor?.toIso8601String(),
      'isAirportPickup': instance.isAirportPickup,
      'isAirportDropoff': instance.isAirportDropoff,
      'promoCode': instance.promoCode,
      'customerId': instance.customerId,
      'distanceKm': instance.distanceKm,
      'durationMinutes': instance.durationMinutes,
    };

PricingResponse _$PricingResponseFromJson(Map<String, dynamic> json) =>
    PricingResponse(
      success: json['success'] as bool,
      fareBreakdown: FareBreakdown.fromJson(
        json['fareBreakdown'] as Map<String, dynamic>,
      ),
      routeGeometry: json['routeGeometry'] as Map<String, dynamic>?,
      estimatedDistanceKm: (json['estimatedDistanceKm'] as num).toDouble(),
      estimatedDurationMinutes: (json['estimatedDurationMinutes'] as num)
          .toInt(),
      error: json['error'] as String?,
    );

Map<String, dynamic> _$PricingResponseToJson(PricingResponse instance) =>
    <String, dynamic>{
      'success': instance.success,
      'fareBreakdown': instance.fareBreakdown,
      'routeGeometry': instance.routeGeometry,
      'estimatedDistanceKm': instance.estimatedDistanceKm,
      'estimatedDurationMinutes': instance.estimatedDurationMinutes,
      'error': instance.error,
    };
