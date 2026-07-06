import 'package:permission_handler/permission_handler.dart';

/// Service for handling runtime permissions across all three apps.
/// Provides a unified interface for location, camera, and storage permissions.
class PermissionService {
  /// Requests location permission.
  /// Returns true if permission is granted, false otherwise.
  Future<bool> requestLocationPermission() async {
    final status = await Permission.location.request();
    return status.isGranted;
  }

  /// Requests background location permission.
  /// This is needed for driver location tracking.
  /// Returns true if permission is granted, false otherwise.
  Future<bool> requestBackgroundLocationPermission() async {
    // First ensure basic location permission is granted
    final locationStatus = await Permission.location.status;
    if (!locationStatus.isGranted) {
      final result = await Permission.location.request();
      if (!result.isGranted) return false;
    }

    // Then request background location
    final status = await Permission.locationAlways.request();
    return status.isGranted;
  }

  /// Checks if location permission is granted.
  Future<bool> isLocationPermissionGranted() async {
    return await Permission.location.isGranted;
  }

  /// Checks if background location permission is granted.
  Future<bool> isBackgroundLocationPermissionGranted() async {
    return await Permission.locationAlways.isGranted;
  }

  /// Requests camera permission.
  /// Used for capturing menu item images in Merchant App.
  /// Returns true if permission is granted, false otherwise.
  Future<bool> requestCameraPermission() async {
    final status = await Permission.camera.request();
    return status.isGranted;
  }

  /// Checks if camera permission is granted.
  Future<bool> isCameraPermissionGranted() async {
    return await Permission.camera.isGranted;
  }

  /// Requests storage permission.
  /// Used for selecting images from gallery in Merchant App.
  /// Returns true if permission is granted, false otherwise.
  Future<bool> requestStoragePermission() async {
    // For Android 13+, we need to request specific permissions
    final photos = await Permission.photos.request();
    if (photos.isGranted) return true;

    // Fallback to storage permission for older Android versions
    final storage = await Permission.storage.request();
    return storage.isGranted;
  }

  /// Checks if storage permission is granted.
  Future<bool> isStoragePermissionGranted() async {
    final photosGranted = await Permission.photos.isGranted;
    if (photosGranted) return true;
    return await Permission.storage.isGranted;
  }

  /// Opens the app settings page.
  /// Used when a permission is permanently denied.
  Future<bool> openAppSettings() async {
    return await openAppSettings();
  }

  /// Checks if a permission is permanently denied (user selected "Don't ask again").
  Future<bool> isLocationPermissionPermanentlyDenied() async {
    return await Permission.location.isPermanentlyDenied;
  }

  /// Checks if camera permission is permanently denied.
  Future<bool> isCameraPermissionPermanentlyDenied() async {
    return await Permission.camera.isPermanentlyDenied;
  }

  /// Checks if storage permission is permanently denied.
  Future<bool> isStoragePermissionPermanentlyDenied() async {
    final photosPermanentlyDenied = await Permission.photos.isPermanentlyDenied;
    if (photosPermanentlyDenied) return true;
    return await Permission.storage.isPermanentlyDenied;
  }

  /// Gets the current status of location permission.
  Future<PermissionStatus> getLocationPermissionStatus() async {
    return await Permission.location.status;
  }

  /// Gets the current status of camera permission.
  Future<PermissionStatus> getCameraPermissionStatus() async {
    return await Permission.camera.status;
  }

  /// Gets the current status of storage permission.
  Future<PermissionStatus> getStoragePermissionStatus() async {
    final photosStatus = await Permission.photos.status;
    if (photosStatus.isGranted) return photosStatus;
    return await Permission.storage.status;
  }
}