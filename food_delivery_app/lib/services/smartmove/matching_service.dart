import 'dart:async';
import '../supabase_service.dart';
import '../../models/smartmove/ride_request.dart';
import '../../models/smartmove/driver_profile.dart';

class SmartMoveMatchingService {
  final SupabaseService _supabaseService = SupabaseService();

  // Find nearby drivers for a ride request
  Future<List<DriverMatch>> findNearbyDrivers({
    required String rideRequestId,
    double searchRadiusKm = 5.0,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.functions.invoke('smartmove-ride-matching', body: {
      'action': 'find_drivers',
      'ride_request_id': rideRequestId,
      'search_radius_km': searchRadiusKm,
    });

    if (response.data['matches'] != null) {
      return (response.data['matches'] as List)
          .map((json) => DriverMatch.fromJson(json))
          .toList();
    }

    return [];
  }

  // Auto-assign best driver
  Future<DriverMatch?> autoAssignDriver({
    required String rideRequestId,
    double searchRadiusKm = 5.0,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.functions.invoke('smartmove-matching-engine', body: {
      'action': 'auto_assign',
      'ride_request_id': rideRequestId,
    });

    if (response.data['success'] == true && response.data['assigned_driver'] != null) {
      return DriverMatch.fromJson(response.data['assigned_driver']);
    }

    return null;
  }

  // Get ride request status
  Future<RideRequestStatus> getRideRequestStatus(String rideRequestId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('ride_requests')
        .select('status')
        .eq('id', rideRequestId)
        .maybeSingle();

    if (response == null) return RideRequestStatus.expired;
    return RideRequestStatus.values.firstWhere(
      (e) => e.name == response['status'],
      orElse: () => RideRequestStatus.expired,
    );
  }

  // Cancel ride request (customer side)
  Future<bool> cancelRideRequest(String rideRequestId, String customerId, {String? reason}) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('ride_requests')
        .update({
          'status': 'cancelled',
          'cancelled_at': DateTime.now().toIso8601String(),
          'cancelled_by': customerId,
          'cancellation_reason': reason,
          'updated_at': DateTime.now().toIso8601String(),
        })
        .eq('id', rideRequestId)
        .eq('customer_id', customerId)
        .inFilter('status', ['searching', 'driver_assigned', 'driver_en_route', 'driver_arrived']);

    return response.count != null && response.count! > 0;
  }

  // Rebook previous ride
  Future<RideRequest?> rebookRide(String previousRideRequestId, String customerId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    // Get previous ride request
    final previousRequest = await client
        .from('ride_requests')
        .select('*, ride_stops(*)')
        .eq('id', previousRideRequestId)
        .eq('customer_id', customerId)
        .maybeSingle();

    if (previousRequest == null) return null;

    // Create new ride request with same details
    final response = await client.functions.invoke('smartmove-matching-engine', body: {
      'action': 'auto_assign',
      'ride_request_data': {
        ...previousRequest,
        'id': null,
        'created_at': DateTime.now().toIso8601String(),
        'updated_at': DateTime.now().toIso8601String(),
        'status': 'searching',
        'assigned_driver_id': null,
        'assigned_at': null,
        'driver_accepted_at': null,
        'driver_arrived_at': null,
        'ride_started_at': null,
        'ride_completed_at': null,
        'cancelled_at': null,
        'cancelled_by': null,
        'cancellation_reason': null,
        'cancellation_fee': 0,
        'actual_distance_km': null,
        'actual_duration_minutes': null,
        'actual_fare': null,
        'platform_fee': 0,
        'driver_earnings': 0,
        'tip_amount': 0,
        'rating': null,
        'feedback': null,
      },
    });

    if (response.data['success'] == true) {
      return RideRequest.fromJson(response.data['ride_request']);
    }

    return null;
  }
}

class DriverMatch {
  final String driverId;
  final double distanceKm;
  final int etaMinutes;
  final double score;
  final double driverRating;
  final double acceptanceRate;

  DriverMatch({
    required this.driverId,
    required this.distanceKm,
    required this.etaMinutes,
    required this.score,
    required this.driverRating,
    required this.acceptanceRate,
  });

  factory DriverMatch.fromJson(Map<String, dynamic> json) {
    return DriverMatch(
      driverId: json['driver_id'] as String,
      distanceKm: (json['distance_km'] as num).toDouble(),
      etaMinutes: json['eta_minutes'] as int,
      score: (json['score'] as num).toDouble(),
      driverRating: (json['driver_rating'] as num).toDouble(),
      acceptanceRate: (json['acceptance_rate'] as num).toDouble(),
    );
  }
}