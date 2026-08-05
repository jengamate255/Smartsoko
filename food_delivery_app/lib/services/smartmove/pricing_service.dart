import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../supabase_service.dart';
import '../../models/smartmove/vehicle_type.dart';
import '../../models/smartmove/promo_code.dart';
import 'ride_service.dart';

class SmartMovePricingService {
  final SupabaseService _supabaseService = SupabaseService();

  // Get fare estimate for a ride
  Future<FareEstimateResponse> getFareEstimate({
    required String vehicleTypeId,
    required double pickupLatitude,
    required double pickupLongitude,
    required double dropoffLatitude,
    required double dropoffLongitude,
    String? pickupZoneId,
    String? dropoffZoneId,
    DateTime? scheduledFor,
    bool isAirportPickup = false,
    bool isAirportDropoff = false,
    String? promoCode,
    String? customerId,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    // Call the pricing edge function
    final response = await client.functions.invoke('smartmove-pricing', body: {
      'vehicle_type_id': vehicleTypeId,
      'pickup_latitude': pickupLatitude,
      'pickup_longitude': pickupLongitude,
      'dropoff_latitude': dropoffLatitude,
      'dropoff_longitude': dropoffLongitude,
      'pickup_zone_id': pickupZoneId,
      'dropoff_zone_id': dropoffZoneId,
      'scheduled_for': scheduledFor?.toIso8601String(),
      'is_airport_pickup': isAirportPickup,
      'is_airport_dropoff': isAirportDropoff,
      'promo_code': promoCode,
      'customer_id': customerId,
    });

    if (response.data['success'] != true) {
      throw Exception(response.data['error'] ?? 'Failed to get fare estimate');
    }

    return FareEstimateResponse.fromJson(response.data);
  }

  // Get available vehicle types
  Future<List<VehicleType>> getVehicleTypes({bool activeOnly = true}) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    var query = client.from('vehicle_types').select();
    if (activeOnly) {
      query = query.eq('is_active', true);
    }
    final response = await query.order('sort_order');
    return (response as List).map((json) => VehicleType.fromJson(json)).toList();
  }

  // Get vehicle type by ID
  Future<VehicleType?> getVehicleType(String vehicleTypeId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('vehicle_types')
        .select()
        .eq('id', vehicleTypeId)
        .maybeSingle();

    if (response == null) return null;
    return VehicleType.fromJson(response);
  }

  // Validate promo code
  Future<PromoValidationResult> validatePromoCode({
    required String code,
    required String customerId,
    required int estimatedFare,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.rpc('validate_ride_promo_code', params: {
      'p_code': code.toUpperCase(),
      'p_customer_id': customerId,
      'p_estimated_fare': estimatedFare,
    });

    return PromoValidationResult.fromJson(response);
  }

  // Get active promotions for customer
  Future<List<RidePromotion>> getActivePromotions(String customerId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    // Get customer's first ride status
    final rideCountResponse = await client
        .from('ride_requests')
        .select('id')
        .eq('customer_id', customerId)
        .eq('status', 'completed')
        .count(CountOption.exact);

    final isFirstRide = rideCountResponse.count == 0;

    final now = DateTime.now().toIso8601String();
    final response = await client
        .from('ride_promotions')
        .select()
        .eq('is_active', true)
        .lte('valid_from', now)
        .or('valid_until.is.null,valid_until.gte.$now')
        .order('discount_value', ascending: false);

    final promotions = (response as List).map((json) => RidePromotion.fromJson(json)).toList();
    
    // Filter out first-ride-only if not first ride
    return promotions.where((p) => !p.isFirstRideOnly || isFirstRide).toList();
  }
}