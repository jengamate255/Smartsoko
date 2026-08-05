import 'dart:async';
import 'dart:typed_data';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../supabase_service.dart';
import '../../models/smartmove/ride.dart';
import '../../models/smartmove/ride_request.dart';
import '../../models/smartmove/driver_profile.dart';
import '../../models/smartmove/driver_earnings.dart';

class SmartMoveDriverService {
  final SupabaseService _supabaseService = SupabaseService();

  // Get driver profile
  Future<DriverProfile?> getDriverProfile(String userId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('driver_profiles')
        .select('*, vehicle_types(*)')
        .eq('user_id', userId)
        .maybeSingle();

    if (response == null) return null;
    return DriverProfile.fromJson(response);
  }

  // Update driver online/offline status
  Future<bool> setOnlineStatus(String userId, bool isOnline) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('driver_profiles')
        .update({
          'is_online': isOnline,
          'updated_at': DateTime.now().toIso8601String(),
        })
        .eq('user_id', userId);

    return response.count != null && response.count! > 0;
  }

  // Update driver location (called periodically by driver app)
  Future<void> updateLocation({
    required String userId,
    required double latitude,
    required double longitude,
    double? heading,
    double? speed,
    double? accuracy,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    // Update driver_profiles for quick lookups
    await client.from('driver_profiles').update({
      'current_latitude': latitude,
      'current_longitude': longitude,
      'current_heading': heading,
      'last_location_update': DateTime.now().toIso8601String(),
      'updated_at': DateTime.now().toIso8601String(),
    }).eq('user_id', userId);

    // Insert into driver_locations for history/tracking
    await client.from('driver_locations').insert({
      'driver_id': userId,
      'latitude': latitude,
      'longitude': longitude,
      'heading': heading,
      'speed': speed,
      'accuracy': accuracy,
      'is_online': true,
      'is_on_trip': false, // Will be updated when on trip
      'recorded_at': DateTime.now().toIso8601String(),
    });
  }

  // Get available rides for driver (matching)
  Future<List<RideRequest>> getAvailableRides(String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final driver = await getDriverProfile(driverId);
    if (driver == null || !driver.isOnline || driver.status != DriverStatus.approved) {
      return [];
    }

    final response = await client
        .from('ride_requests')
        .select('*, vehicle_types(*)')
        .eq('vehicle_type_id', driver.vehicleTypeId ?? '')
        .eq('status', 'searching')
        .order('created_at');

    return (response as List).map((json) => RideRequest.fromJson(json)).toList();
  }

  // Accept ride request
  Future<bool> acceptRide(String rideRequestId, String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.functions.invoke('smartmove-matching-engine', body: {
      'action': 'driver_response',
      'assignment_id': rideRequestId, // This would need to be the assignment ID
      'driver_id': driverId,
      'response': 'accepted',
    });

    return response.data['success'] == true;
  }

  // Reject ride request
  Future<bool> rejectRide(String assignmentId, String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.functions.invoke('smartmove-matching-engine', body: {
      'action': 'driver_response',
      'assignment_id': assignmentId,
      'driver_id': driverId,
      'response': 'rejected',
    });

    return response.data['success'] == true;
  }

  // Get active ride for driver
  Future<Ride?> getActiveRide(String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('rides')
        .select('*, ride_requests(*)')
        .eq('driver_id', driverId)
        .inFilter('status', ['assigned', 'driver_en_route', 'driver_arrived', 'in_progress'])
        .order('created_at', ascending: false)
        .limit(1)
        .maybeSingle();

    if (response == null) return null;
    return Ride.fromJson(response);
  }

  // Get ride history for driver
  Future<List<Ride>> getRideHistory(String driverId, {int limit = 20, int offset = 0}) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('rides')
        .select('*, ride_requests(*)')
        .eq('driver_id', driverId)
        .order('created_at', ascending: false)
        .range(offset, offset + limit - 1);

    return (response as List).map((json) => Ride.fromJson(json)).toList();
  }

  // Get earnings summary
  Future<DriverEarningsSummary> getEarningsSummary(String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.rpc('get_driver_wallet_summary', params: {
      'p_driver_id': driverId,
    });

    return DriverEarningsSummary.fromJson(response);
  }

  // Get daily earnings
  Future<DriverEarningsPeriod> getDailyEarnings(String driverId, DateTime date) async {
    return getEarningsPeriod(driverId, 'daily', date);
  }

  // Get weekly earnings
  Future<DriverEarningsPeriod> getWeeklyEarnings(String driverId, DateTime weekStart) async {
    return getEarningsPeriod(driverId, 'weekly', weekStart);
  }

  Future<DriverEarningsPeriod> getEarningsPeriod(String driverId, String periodType, DateTime periodStart) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.rpc('get_driver_earnings_period', params: {
      'p_driver_id': driverId,
      'p_period_type': periodType,
      'p_period_start': periodStart.toIso8601String().split('T')[0],
    });

    return DriverEarningsPeriod.fromJson(response);
  }

  // Request withdrawal
  Future<WithdrawalResult> requestWithdrawal(String driverId, int amount) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.rpc('withdraw_driver_wallet', params: {
      'p_driver_id': driverId,
      'p_amount': amount,
    });

    return WithdrawalResult.fromJson(response);
  }

  // Update driver profile
  Future<bool> updateProfile({
    required String userId,
    String? vehicleMake,
    String? vehicleModel,
    int? vehicleYear,
    String? vehicleColor,
    String? vehiclePlate,
    String? vehicleImageUrl,
    List<String>? preferredZones,
    int? maxDistanceFromZone,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final updates = <String, dynamic>{
      'updated_at': DateTime.now().toIso8601String(),
    };

    if (vehicleMake != null) updates['vehicle_make'] = vehicleMake;
    if (vehicleModel != null) updates['vehicle_model'] = vehicleModel;
    if (vehicleYear != null) updates['vehicle_year'] = vehicleYear;
    if (vehicleColor != null) updates['vehicle_color'] = vehicleColor;
    if (vehiclePlate != null) updates['vehicle_plate'] = vehiclePlate;
    if (vehicleImageUrl != null) updates['vehicle_image_url'] = vehicleImageUrl;
    if (preferredZones != null) updates['preferred_zones'] = preferredZones;
    if (maxDistanceFromZone != null) updates['max_distance_from_zone'] = maxDistanceFromZone;

    final response = await client
        .from('driver_profiles')
        .update(updates)
        .eq('user_id', userId);

    return response.count != null && response.count! > 0;
  }

  // Upload document
  Future<String?> uploadDocument({
    required String userId,
    required String documentType,
    required List<int> fileBytes,
    required String fileName,
    String? mimeType,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final path = 'driver_documents/$userId/$documentType/${DateTime.now().millisecondsSinceEpoch}_$fileName';

    try {
      await client.storage
          .from('documents')
          .uploadBinary(path, Uint8List.fromList(fileBytes), fileOptions: FileOptions(contentType: mimeType));
    } catch (e) {
      throw Exception('Failed to upload document: $e');
    }

    // Create document record
    final docResponse = await client.from('driver_documents').insert({
      'driver_id': userId,
      'document_type': documentType,
      'file_url': path,
      'file_name': fileName,
      'mime_type': mimeType,
      'status': 'pending',
    }).select().single();

    return docResponse['file_url'] as String?;
  }

  // Get driver documents
  Future<List<DriverDocument>> getDocuments(String userId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('driver_documents')
        .select()
        .eq('driver_id', userId)
        .order('created_at', ascending: false);

    return (response as List).map((json) => DriverDocument.fromJson(json)).toList();
  }
}

// DriverEarningsSummary, DriverEarningsPeriod, WithdrawalResult
// are defined in lib/models/smartmove/driver_earnings.dart

class DriverDocument {
  final String id;
  final String driverId;
  final String documentType;
  final String fileUrl;
  final String? fileName;
  final int? fileSize;
  final String? mimeType;
  final String status;
  final DateTime? verifiedAt;
  final String? rejectionReason;
  final DateTime? expiryDate;
  final DateTime createdAt;

  DriverDocument({
    required this.id,
    required this.driverId,
    required this.documentType,
    required this.fileUrl,
    this.fileName,
    this.fileSize,
    this.mimeType,
    required this.status,
    this.verifiedAt,
    this.rejectionReason,
    this.expiryDate,
    required this.createdAt,
  });

  factory DriverDocument.fromJson(Map<String, dynamic> json) {
    return DriverDocument(
      id: json['id'] as String,
      driverId: json['driver_id'] as String,
      documentType: json['document_type'] as String,
      fileUrl: json['file_url'] as String,
      fileName: json['file_name'] as String?,
      fileSize: json['file_size'] as int?,
      mimeType: json['mime_type'] as String?,
      status: json['status'] as String,
      verifiedAt: json['verified_at'] != null ? DateTime.parse(json['verified_at'] as String) : null,
      rejectionReason: json['rejection_reason'] as String?,
      expiryDate: json['expiry_date'] != null ? DateTime.parse(json['expiry_date'] as String) : null,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }
}