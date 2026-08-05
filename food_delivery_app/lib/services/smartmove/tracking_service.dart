import 'dart:async';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../supabase_service.dart';
import '../../models/smartmove/ride.dart';
import '../../models/smartmove/ride_event.dart';

class SmartMoveTrackingService {
  final SupabaseService _supabaseService = SupabaseService();

  RealtimeChannel? _rideChannel;
  RealtimeChannel? _driverLocationChannel;
  
  final StreamController<DriverLocationUpdate> _locationController = 
      StreamController<DriverLocationUpdate>.broadcast();
  final StreamController<RideStatusUpdate> _statusController = 
      StreamController<RideStatusUpdate>.broadcast();
  final StreamController<RideEvent> _eventController = 
      StreamController<RideEvent>.broadcast();

  Stream<DriverLocationUpdate> get locationStream => _locationController.stream;
  Stream<RideStatusUpdate> get statusStream => _statusController.stream;
  Stream<RideEvent> get eventStream => _eventController.stream;

  // Subscribe to ride updates
  void subscribeToRide(String rideId) {
    _rideChannel = _supabaseService.client
        .channel('ride-$rideId')
        .onPostgresChanges(
          event: PostgresChangeEvent.all,
          schema: 'public',
          table: 'rides',
          filter: PostgresChangeFilter(
            type: PostgresChangeFilterType.eq,
            column: 'id',
            value: rideId,
          ),
          callback: (payload) {
            final ride = Ride.fromJson(payload.newRecord);
            _statusController.add(RideStatusUpdate(
              rideId: rideId,
              status: ride.status,
              timestamp: DateTime.now(),
            ));
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
            final event = RideEvent.fromJson(payload.newRecord);
            _eventController.add(event);
          },
        )
        .subscribe();
  }

  // Subscribe to driver location updates for a ride
  void subscribeToDriverLocation(String rideId, String driverId) {
    _driverLocationChannel = _supabaseService.client
        .channel('driver-location-$driverId')
        .onBroadcast(
          event: 'driver_location_update',
          callback: (payload) {
            _locationController.add(DriverLocationUpdate.fromJson(payload));
          },
        )
        .subscribe();
  }

  // Update driver location (called by driver app)
  Future<void> updateDriverLocation({
    required String driverId,
    required String rideId,
    required double latitude,
    required double longitude,
    double? heading,
    double? speed,
    double? accuracy,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    await client.functions.invoke('smartmove-tracking', body: {
      'action': 'update_location',
      'driver_id': driverId,
      'ride_id': rideId,
      'latitude': latitude,
      'longitude': longitude,
      'heading': heading,
      'speed': speed,
      'accuracy': accuracy,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  // Update ride status
  Future<void> updateRideStatus({
    required String rideId,
    required RideStatus status,
    required String actorId,
    required String actorRole,
    Map<String, dynamic>? metadata,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    await client.functions.invoke('smartmove-matching', body: {
      'action': 'update_status',
      'ride_id': rideId,
      'status': status.name,
      'actor_id': actorId,
      'actor_role': actorRole,
      'metadata': metadata ?? {},
    });
  }

  // Start ride (driver arrived, passenger in car)
  Future<void> startRide(String rideId, String driverId) async {
    await updateRideStatus(
      rideId: rideId,
      status: RideStatus.inProgress,
      actorId: driverId,
      actorRole: 'driver',
    );
  }

  // Complete ride
  Future<void> completeRide(String rideId, String driverId) async {
    await updateRideStatus(
      rideId: rideId,
      status: RideStatus.completed,
      actorId: driverId,
      actorRole: 'driver',
    );
  }

  // Cancel ride
  Future<void> cancelRide({
    required String rideId,
    required String actorId,
    required String actorRole,
    String? reason,
  }) async {
    await updateRideStatus(
      rideId: rideId,
      status: RideStatus.cancelled,
      actorId: actorId,
      actorRole: actorRole,
      metadata: {'reason': reason},
    );
  }

  // Get route from Mapbox
  Future<RouteInfo?> getRoute({
    required double pickupLat,
    required double pickupLon,
    required double dropoffLat,
    required double dropoffLon,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.functions.invoke('smartmove-tracking', body: {
      'action': 'get_route',
      'pickup_lat': pickupLat,
      'pickup_lon': pickupLon,
      'dropoff_lat': dropoffLat,
      'dropoff_lon': dropoffLon,
    });

    if (response.data['route'] != null) {
      return RouteInfo.fromJson(response.data['route']);
    }
    return null;
  }

  // Get ETAs for current ride
  Future<RideETAs?> getETAs(String rideId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.functions.invoke('smartmove-tracking', body: {
      'action': 'get_etas',
      'ride_id': rideId,
    });

    if (response.data['etas'] != null) {
      return RideETAs.fromJson(response.data['etas']);
    }
    return null;
  }

  // Dispose subscriptions
  void dispose() {
    _rideChannel?.unsubscribe();
    _driverLocationChannel?.unsubscribe();
    _locationController.close();
    _statusController.close();
    _eventController.close();
  }
}

class DriverLocationUpdate {
  final double latitude;
  final double longitude;
  final double? heading;
  final double? speed;
  final DateTime timestamp;

  DriverLocationUpdate({
    required this.latitude,
    required this.longitude,
    this.heading,
    this.speed,
    required this.timestamp,
  });

  factory DriverLocationUpdate.fromJson(Map<String, dynamic> json) {
    return DriverLocationUpdate(
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      heading: json['heading'] != null ? (json['heading'] as num).toDouble() : null,
      speed: json['speed'] != null ? (json['speed'] as num).toDouble() : null,
      timestamp: DateTime.parse(json['timestamp'] as String),
    );
  }
}

class RideStatusUpdate {
  final String rideId;
  final RideStatus status;
  final DateTime timestamp;

  RideStatusUpdate({
    required this.rideId,
    required this.status,
    required this.timestamp,
  });
}

class RouteInfo {
  final Map<String, dynamic> geometry;
  final double distanceKm;
  final int durationMinutes;
  final List<RouteStep> steps;

  RouteInfo({
    required this.geometry,
    required this.distanceKm,
    required this.durationMinutes,
    required this.steps,
  });

  factory RouteInfo.fromJson(Map<String, dynamic> json) {
    return RouteInfo(
      geometry: json['geometry'] as Map<String, dynamic>,
      distanceKm: (json['distance_km'] as num).toDouble(),
      durationMinutes: json['duration_minutes'] as int,
      steps: (json['steps'] as List?)
          ?.map((s) => RouteStep.fromJson(s as Map<String, dynamic>))
          .toList() ?? [],
    );
  }
}

class RouteStep {
  final String instruction;
  final double distanceKm;
  final int durationSeconds;
  final String maneuverType;

  RouteStep({
    required this.instruction,
    required this.distanceKm,
    required this.durationSeconds,
    required this.maneuverType,
  });

  factory RouteStep.fromJson(Map<String, dynamic> json) {
    return RouteStep(
      instruction: json['instruction'] as String,
      distanceKm: (json['distance_km'] as num).toDouble(),
      durationSeconds: json['duration_seconds'] as int,
      maneuverType: json['maneuver_type'] as String,
    );
  }
}

class RideETAs {
  final ETADetail? toPickup;
  final ETADetail? toDropoff;

  RideETAs({
    this.toPickup,
    this.toDropoff,
  });

  factory RideETAs.fromJson(Map<String, dynamic> json) {
    return RideETAs(
      toPickup: json['to_pickup'] != null ? ETADetail.fromJson(json['to_pickup']) : null,
      toDropoff: json['to_dropoff'] != null ? ETADetail.fromJson(json['to_dropoff']) : null,
    );
  }
}

class ETADetail {
  final double distanceKm;
  final int durationMinutes;

  ETADetail({
    required this.distanceKm,
    required this.durationMinutes,
  });

  factory ETADetail.fromJson(Map<String, dynamic> json) {
    return ETADetail(
      distanceKm: (json['distance_km'] as num).toDouble(),
      durationMinutes: json['duration_minutes'] as int,
    );
  }
}