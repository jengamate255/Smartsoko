import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:json_annotation/json_annotation.dart';
import '../../utils/logger.dart';
import '../supabase_service.dart';
import '../../models/smartmove/ride_request.dart';
import '../../models/smartmove/ride.dart';
import '../../models/smartmove/ride_stop.dart';
import '../../models/smartmove/fare_breakdown.dart';
import 'tracking_service.dart';

part 'ride_service.g.dart';

class SmartMoveRideService {
  static final SmartMoveRideService _instance = SmartMoveRideService._internal();
  factory SmartMoveRideService() => _instance;
  SmartMoveRideService._internal();

  final SupabaseClient _client = SupabaseService().client;
  RealtimeChannel? _rideRequestChannel;
  RealtimeChannel? _rideChannel;
  RealtimeChannel? _driverLocationChannel;

  // Create a new ride request
  Future<RideRequest> createRideRequest({
    required String customerId,
    required String vehicleTypeId,
    required double pickupLatitude,
    required double pickupLongitude,
    required String pickupAddress,
    required double dropoffLatitude,
    required double dropoffLongitude,
    required String dropoffAddress,
    DateTime? scheduledFor,
    String? promoCodeId,
    required PaymentMethod paymentMethod,
    List<RideStop>? stops,
  }) async {
    try {
      AppLogger.info('Creating ride request for customer: $customerId');

      // Get fare estimate first
      final fareResponse = await _estimateFare(
        vehicleTypeId: vehicleTypeId,
        pickupLat: pickupLatitude,
        pickupLon: pickupLongitude,
        dropoffLat: dropoffLatitude,
        dropoffLon: dropoffLongitude,
        promoCode: promoCodeId,
        customerId: customerId,
      );

      final rideRequest = RideRequest(
        id: '', // Will be set by database
        customerId: customerId,
        vehicleTypeId: vehicleTypeId,
        pickupLatitude: pickupLatitude,
        pickupLongitude: pickupLongitude,
        pickupAddress: pickupAddress,
        dropoffLatitude: dropoffLatitude,
        dropoffLongitude: dropoffLongitude,
        dropoffAddress: dropoffAddress,
        scheduledFor: scheduledFor,
        isScheduled: scheduledFor != null,
        estimatedDistanceKm: fareResponse.estimatedDistanceKm,
        estimatedDurationMinutes: fareResponse.estimatedDurationMinutes,
        estimatedFare: fareResponse.fareBreakdown.totalFare,
        surgeMultiplier: fareResponse.fareBreakdown.surgeMultiplier,
        promoCodeId: promoCodeId,
        paymentMethod: paymentMethod,
        paymentStatus: PaymentStatus.pending,
        status: scheduledFor != null ? RideRequestStatus.searching : RideRequestStatus.searching,
        cancellationFee: 0,
        platformFee: fareResponse.fareBreakdown.platformFee,
        driverEarnings: fareResponse.fareBreakdown.driverEarnings,
        tipAmount: 0,
        metadata: {
          'fare_breakdown': fareResponse.fareBreakdown.toJson(),
          'stops': stops?.map((s) => s.toJson()).toList(),
        },
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final response = await _client
          .from('ride_requests')
          .insert(rideRequest.toJson())
          .select()
          .single();

      // If stops provided, insert them
      if (stops != null && stops.isNotEmpty) {
        await _client.from('ride_stops').insert(
          stops.map((s) => s.toJson()).toList(),
        );
      }

      // If not scheduled, add to matching queue
      if (scheduledFor == null) {
        await _addToMatchingQueue(response['id'] as String);
      }

      AppLogger.info('Ride request created: ${response['id']}');
      return RideRequest.fromJson(response);
    } catch (e) {
      AppLogger.error('Error creating ride request', e);
      rethrow;
    }
  }

  // Get fare estimate
  Future<FareEstimateResponse> _estimateFare({
    required String vehicleTypeId,
    required double pickupLat,
    required double pickupLon,
    required double dropoffLat,
    required double dropoffLon,
    String? promoCode,
    String? customerId,
  }) async {
    try {
      final response = await _client.functions.invoke('smartmove-pricing', body: {
        'vehicle_type_id': vehicleTypeId,
        'pickup_latitude': pickupLat,
        'pickup_longitude': pickupLon,
        'dropoff_latitude': dropoffLat,
        'dropoff_longitude': dropoffLon,
        'promo_code': promoCode,
        'customer_id': customerId,
      });

      if (response.data['success'] == true) {
        return FareEstimateResponse.fromJson(response.data);
      }
      throw Exception('Failed to get fare estimate: ${response.data['error']}');
    } catch (e) {
      AppLogger.error('Error estimating fare', e);
      rethrow;
    }
  }

  // Add to matching queue
  Future<void> _addToMatchingQueue(String rideRequestId) async {
    await _client.functions.invoke('smartmove-matching-engine', body: {
      'action': 'auto_assign',
      'ride_request_id': rideRequestId,
    });
  }

  // Get ride request by ID
  Future<RideRequest?> getRideRequest(String rideRequestId) async {
    final response = await _client
        .from('ride_requests')
        .select('*, ride_stops(*)')
        .eq('id', rideRequestId)
        .maybeSingle();

    if (response == null) return null;

    final rideRequest = RideRequest.fromJson(response);
    if (response['ride_stops'] != null) {
      rideRequest.metadata['stops'] = response['ride_stops'];
    }
    return rideRequest;
  }

  // Get customer's ride requests
  Future<List<RideRequest>> getCustomerRideRequests(String customerId, {
    int limit = 20,
    int offset = 0,
    RideRequestStatus? status,
  }) async {
    var query = _client
        .from('ride_requests')
        .select('*, ride_stops(*)')
        .eq('customer_id', customerId);

    if (status != null) {
      query = query.eq('status', status.name);
    }

    final response = await query
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1);
    return (response as List).map((json) => RideRequest.fromJson(json)).toList();
  }

  // Cancel ride request
  Future<bool> cancelRideRequest(String rideRequestId, String customerId, {String? reason}) async {
    try {
      final response = await _client
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
    } catch (e) {
      AppLogger.error('Error cancelling ride request', e);
      return false;
    }
  }

  // Get active ride for customer
  Future<Ride?> getActiveRideForCustomer(String customerId) async {
    final response = await _client
        .from('rides')
        .select('*, ride_requests(*), driver_profiles!rides_driver_id_fkey(*)')
        .eq('customer_id', customerId)
        .inFilter('status', ['assigned', 'driver_en_route', 'driver_arrived', 'in_progress'])
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (response == null) return null;
    return Ride.fromJson(response);
  }

  // Get active ride for driver
  Future<Ride?> getActiveRideForDriver(String driverId) async {
    final response = await _client
        .from('rides')
        .select('*, ride_requests(*), profiles!rides_customer_id_fkey(*)')
        .eq('driver_id', driverId)
        .inFilter('status', ['assigned', 'driver_en_route', 'driver_arrived', 'in_progress'])
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (response == null) return null;
    return Ride.fromJson(response);
  }

  // Subscribe to ride request updates
  Stream<RideRequest> subscribeToRideRequest(String rideRequestId) {
    final controller = StreamController<RideRequest>.broadcast();

    _rideRequestChannel = _client
        .channel('ride-request-$rideRequestId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'ride_requests',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: rideRequestId,
          ),
          callback: (payload) {
            controller.add(RideRequest.fromJson(payload.newRecord));
          },
        )
        .subscribe();

    controller.onCancel = () {
      _rideRequestChannel?.unsubscribe();
    };

    return controller.stream;
  }

  // Subscribe to ride updates
  Stream<Ride> subscribeToRide(String rideId) {
    final controller = StreamController<Ride>.broadcast();

    _rideChannel = _client
        .channel('ride-$rideId')
        .onPostgresChanges(
          event: PostgresChangeEvent.update,
          schema: 'public',
          table: 'rides',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: rideId,
          ),
          callback: (payload) {
            controller.add(Ride.fromJson(payload.newRecord));
          },
        )
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'ride_events',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'ride_id',
            value: rideId,
          ),
          callback: (payload) {
            // Ride events are handled by eventStream in tracking service
          },
        )
        .subscribe();

    controller.onCancel = () {
      _rideChannel?.unsubscribe();
    };

    return controller.stream;
  }

  // Subscribe to driver location updates for a ride
  Stream<DriverLocationUpdate> subscribeToDriverLocation(String rideId) {
    final controller = StreamController<DriverLocationUpdate>.broadcast();

    _driverLocationChannel = _client
        .channel('ride-$rideId')
        .onBroadcast(
          event: 'driver_location_update',
          callback: (payload) {
            controller.add(DriverLocationUpdate.fromJson(payload));
          },
        )
        .subscribe();

    controller.onCancel = () {
      _driverLocationChannel?.unsubscribe();
    };

    return controller.stream;
  }

  // Get ride history for customer
  Future<List<Ride>> getCustomerRideHistory(String customerId, {
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _client
        .from('rides')
        .select('*, ride_requests(*)')
        .eq('customer_id', customerId)
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1);

    return (response as List).map((json) => Ride.fromJson(json)).toList();
  }

  // Get ride history for driver
  Future<List<Ride>> getDriverRideHistory(String driverId, {
    int limit = 20,
    int offset = 0,
  }) async {
    final response = await _client
        .from('rides')
        .select('*, ride_requests(*)')
        .eq('driver_id', driverId)
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1);

    return (response as List).map((json) => Ride.fromJson(json)).toList();
  }

  // Rate a ride
  Future<bool> rateRide({
    required String rideId,
    required String customerId,
    required String driverId,
    required double rating,
    String? feedback,
  }) async {
    try {
      await _client.from('ride_ratings').insert({
        'ride_id': rideId,
        'customer_id': customerId,
        'driver_id': driverId,
        'rating': rating,
        'feedback': feedback,
      });

      // Update ride with rating
      await _client.from('rides').update({
        'customer_rating': rating,
        'customer_feedback': feedback,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', rideId);

      return true;
    } catch (e) {
      AppLogger.error('Error rating ride', e);
      return false;
    }
  }

  // Add tip to ride
  Future<bool> addTip({
    required String rideId,
    required String customerId,
    required int amount,
  }) async {
    try {
      // This would integrate with SmartWallet/SmartPay
      // For now, just update the ride record
      await _client.from('rides').update({
        'tip_amount': amount,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', rideId).eq('customer_id', customerId);

      return true;
    } catch (e) {
      AppLogger.error('Error adding tip', e);
      return false;
    }
  }

  // Get ride receipt
  Future<Map<String, dynamic>?> getRideReceipt(String rideId) async {
    final response = await _client
        .from('trip_receipts')
        .select()
        .eq('ride_id', rideId)
        .maybeSingle();

    return response;
  }

  // Share ride
  Future<String?> shareRide(String rideId, String customerId) async {
    try {
      final response = await _client.rpc('create_shared_trip', params: {
        'p_ride_id': rideId,
        'p_shared_by': customerId,
      });

      return response['share_token'] as String?;
    } catch (e) {
      AppLogger.error('Error sharing ride', e);
      return null;
    }
  }

  // Get shared ride by token
  Future<Ride?> getSharedRide(String shareToken) async {
    final response = await _client
        .from('shared_trips')
        .select('ride_id, rides(*)')
        .eq('share_token', shareToken)
        .eq('is_active', true)
        .gt('expires_at', DateTime.now().toIso8601String())
        .maybeSingle();

    if (response == null) return null;
    return Ride.fromJson(response['rides']);
  }

  // Get favorite places
  Future<List<FavoritePlace>> getFavoritePlaces(String customerId) async {
    final response = await _client
        .from('favorite_places')
        .select()
        .eq('customer_id', customerId)
        .order('sort_order', ascending: true);

    return (response as List).map((json) => FavoritePlace.fromJson(json)).toList();
  }

  // Add favorite place
  Future<FavoritePlace> addFavoritePlace({
    required String customerId,
    required String name,
    required String address,
    required double latitude,
    required double longitude,
    String? placeId,
    PlaceType placeType = PlaceType.custom,
    String? iconName,
  }) async {
    final response = await _client
        .from('favorite_places')
        .insert({
          'customer_id': customerId,
          'name': name,
          'address': address,
          'latitude': latitude,
          'longitude': longitude,
          'place_id': placeId,
          'place_type': placeType.name,
          'icon_name': iconName,
        })
        .select()
        .single();

    return FavoritePlace.fromJson(response);
  }

  // Update favorite place
  Future<bool> updateFavoritePlace(String placeId, {
    String? name,
    String? address,
    int? sortOrder,
  }) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['name'] = name;
    if (address != null) updates['address'] = address;
    if (sortOrder != null) updates['sort_order'] = sortOrder;
    updates['updated_at'] = DateTime.now().toIso8601String();

    if (updates.length <= 1) return false;

    final response = await _client
        .from('favorite_places')
        .update(updates)
        .eq('id', placeId);

    return response.count != null && response.count! > 0;
  }

  // Delete favorite place
  Future<bool> deleteFavoritePlace(String placeId) async {
    final response = await _client
        .from('favorite_places')
        .delete()
        .eq('id', placeId);

    return response.count != null && response.count! > 0;
  }

  // Get saved routes
  Future<List<SavedRoute>> getSavedRoutes(String customerId) async {
    final response = await _client
        .from('saved_routes')
        .select()
        .eq('customer_id', customerId)
        .order('use_count', ascending: false);

    return (response as List).map((json) => SavedRoute.fromJson(json)).toList();
  }

  // Save route
  Future<SavedRoute> saveRoute({
    required String customerId,
    required String name,
    required double pickupLat,
    required double pickupLon,
    required String pickupAddress,
    required double dropoffLat,
    required double dropoffLon,
    required String dropoffAddress,
    String? vehicleTypeId,
    int? estimatedFare,
    int? estimatedDurationMinutes,
  }) async {
    final response = await _client
        .from('saved_routes')
        .insert({
          'customer_id': customerId,
          'name': name,
          'pickup_latitude': pickupLat,
          'pickup_longitude': pickupLon,
          'pickup_address': pickupAddress,
          'dropoff_latitude': dropoffLat,
          'dropoff_longitude': dropoffLon,
          'dropoff_address': dropoffAddress,
          'vehicle_type_id': vehicleTypeId,
          'estimated_fare': estimatedFare,
          'estimated_duration_minutes': estimatedDurationMinutes,
        })
        .select()
        .single();

    return SavedRoute.fromJson(response);
  }

  // Use saved route (increment counter)
  Future<void> useSavedRoute(String routeId) async {
    await _client.rpc('increment_saved_route_use', params: {'p_route_id': routeId});
  }

  // Dispose subscriptions
  void dispose() {
    _rideRequestChannel?.unsubscribe();
    _rideChannel?.unsubscribe();
    _driverLocationChannel?.unsubscribe();
  }
}

// Supporting models
class FareEstimateResponse {
  final FareBreakdown fareBreakdown;
  final double estimatedDistanceKm;
  final int estimatedDurationMinutes;
  final Map<String, dynamic>? routeGeometry;

  FareEstimateResponse({
    required this.fareBreakdown,
    required this.estimatedDistanceKm,
    required this.estimatedDurationMinutes,
    this.routeGeometry,
  });

  factory FareEstimateResponse.fromJson(Map<String, dynamic> json) {
    return FareEstimateResponse(
      fareBreakdown: FareBreakdown.fromJson(json['fare_breakdown']),
      estimatedDistanceKm: (json['estimated_distance_km'] as num).toDouble(),
      estimatedDurationMinutes: json['estimated_duration_minutes'] as int,
      routeGeometry: json['route_geometry'] as Map<String, dynamic>?,
    );
  }
}

// DriverLocationUpdate is defined in tracking_service.dart

@JsonSerializable()
class FavoritePlace {
  final String id;
  final String customerId;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  final String? placeId;
  final PlaceType placeType;
  final String? iconName;
  final int sortOrder;
  final DateTime createdAt;
  final DateTime updatedAt;

  FavoritePlace({
    required this.id,
    required this.customerId,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.placeId,
    required this.placeType,
    this.iconName,
    required this.sortOrder,
    required this.createdAt,
    required this.updatedAt,
  });

  factory FavoritePlace.fromJson(Map<String, dynamic> json) => _$FavoritePlaceFromJson(json);
  Map<String, dynamic> toJson() => _$FavoritePlaceToJson(this);
}

enum PlaceType {
  @JsonValue('home')
  home,
  @JsonValue('work')
  work,
  @JsonValue('custom')
  custom,
  @JsonValue('airport')
  airport,
  @JsonValue('hotel')
  hotel,
  @JsonValue('landmark')
  landmark,
}

@JsonSerializable()
class SavedRoute {
  final String id;
  final String customerId;
  final String name;
  final double pickupLatitude;
  final double pickupLongitude;
  final String pickupAddress;
  final double dropoffLatitude;
  final double dropoffLongitude;
  final String dropoffAddress;
  final String? vehicleTypeId;
  final int? estimatedFare;
  final int? estimatedDurationMinutes;
  final int useCount;
  final DateTime? lastUsedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  SavedRoute({
    required this.id,
    required this.customerId,
    required this.name,
    required this.pickupLatitude,
    required this.pickupLongitude,
    required this.pickupAddress,
    required this.dropoffLatitude,
    required this.dropoffLongitude,
    required this.dropoffAddress,
    this.vehicleTypeId,
    this.estimatedFare,
    this.estimatedDurationMinutes,
    required this.useCount,
    this.lastUsedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory SavedRoute.fromJson(Map<String, dynamic> json) => _$SavedRouteFromJson(json);
  Map<String, dynamic> toJson() => _$SavedRouteToJson(this);
}