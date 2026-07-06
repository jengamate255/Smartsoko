import 'dart:async';
import 'package:geolocator/geolocator.dart';
import 'package:permission_handler/permission_handler.dart';
import 'location_service.dart';

/// Service for tracking driver location in the background
/// Updates location every 10 seconds and syncs to Firestore
class LocationTrackingService {
  final LocationService _locationService;
  Timer? _trackingTimer;
  String? _currentDriverId;
  bool _isTracking = false;

  LocationTrackingService(this._locationService);

  /// Check if background location permission is granted
  Future<bool> hasBackgroundLocationPermission() async {
    if (await Permission.location.isGranted) {
      // Check background location permission (Android 10+)
      final bgStatus = await Permission.locationAlways.status;
      return bgStatus.isGranted;
    }
    return false;
  }

  /// Request background location permission
  /// Returns true if granted, false otherwise
  Future<bool> requestBackgroundLocationPermission() async {
    // First ensure foreground location is granted
    var status = await Permission.location.status;
    if (!status.isGranted) {
      status = await Permission.location.request();
      if (!status.isGranted) {
        return false;
      }
    }

    // Then request background location (Android 10+)
    final bgStatus = await Permission.locationAlways.request();
    return bgStatus.isGranted;
  }

  /// Start tracking driver location
  /// Updates location every 10 seconds and syncs to Firestore
  Future<bool> startTracking(String driverId) async {
    if (_isTracking) {
      // Already tracking, just update driver ID if different
      if (_currentDriverId != driverId) {
        await stopTracking();
      } else {
        return true;
      }
    }

    // Check permissions
    final hasPermission = await hasBackgroundLocationPermission();
    if (!hasPermission) {
      return false;
    }

    _currentDriverId = driverId;
    _isTracking = true;

    // Update location immediately
    await _updateLocation();

    // Start periodic updates every 10 seconds
    _trackingTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _updateLocation(),
    );

    return true;
  }

  /// Stop tracking driver location
  Future<void> stopTracking() async {
    _trackingTimer?.cancel();
    _trackingTimer = null;
    _isTracking = false;

    // Update driver status to offline
    if (_currentDriverId != null) {
      try {
        final position = await _locationService.getCurrentPosition();
        if (position != null) {
          await _locationService.updateRiderLocation(
            _currentDriverId!,
            position.latitude,
            position.longitude,
            isOnline: false,
          );
        }
      } catch (e) {
        // Ignore errors when stopping
      }
      _currentDriverId = null;
    }
  }

  /// Update current location to Firestore
  Future<void> _updateLocation() async {
    if (_currentDriverId == null || !_isTracking) return;

    try {
      final position = await _locationService.getCurrentPosition();
      if (position != null) {
        await _locationService.updateRiderLocation(
          _currentDriverId!,
          position.latitude,
          position.longitude,
          isOnline: true,
        );
      }
    } catch (e) {
      // Log error but continue tracking
      print('Error updating location: $e');
    }
  }

  /// Check if currently tracking
  bool get isTracking => _isTracking;

  /// Get current driver ID being tracked
  String? get currentDriverId => _currentDriverId;

  /// Dispose resources
  void dispose() {
    _trackingTimer?.cancel();
    _trackingTimer = null;
    _isTracking = false;
    _currentDriverId = null;
  }
}
