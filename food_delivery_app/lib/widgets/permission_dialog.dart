import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import '../services/permission_service.dart';

/// Types of permissions that can be requested
enum PermissionType {
  location,
  camera,
  storage,
}

/// Dialog that displays an explanation before requesting a permission
/// and handles the permission request flow
class PermissionDialog extends StatelessWidget {
  final PermissionType permissionType;
  final PermissionService permissionService;
  final VoidCallback? onGranted;
  final VoidCallback? onDenied;

  const PermissionDialog({
    super.key,
    required this.permissionType,
    required this.permissionService,
    this.onGranted,
    this.onDenied,
  });

  /// Gets the title for the permission dialog based on type
  String get _title {
    switch (permissionType) {
      case PermissionType.location:
        return 'Location Permission';
      case PermissionType.camera:
        return 'Camera Permission';
      case PermissionType.storage:
        return 'Storage Permission';
    }
  }

  /// Gets the explanation message for the permission
  String get _explanation {
    switch (permissionType) {
      case PermissionType.location:
        return 'Location access is needed to show nearby restaurants, track your delivery, and provide accurate delivery estimates.';
      case PermissionType.camera:
        return 'Camera access is needed to take photos of menu items for your restaurant.';
      case PermissionType.storage:
        return 'Storage access is needed to select images from your gallery for menu items.';
    }
  }

  /// Gets the icon for the permission type
  IconData get _icon {
    switch (permissionType) {
      case PermissionType.location:
        return Icons.location_on;
      case PermissionType.camera:
        return Icons.camera_alt;
      case PermissionType.storage:
        return Icons.photo_library;
    }
  }

  /// Gets the permission to request
  Permission get _permission {
    switch (permissionType) {
      case PermissionType.location:
        return Permission.location;
      case PermissionType.camera:
        return Permission.camera;
      case PermissionType.storage:
        return Permission.photos;
    }
  }

  /// Checks if the permission is permanently denied
  Future<bool> _isPermanentlyDenied() async {
    switch (permissionType) {
      case PermissionType.location:
        return await permissionService.isLocationPermissionPermanentlyDenied();
      case PermissionType.camera:
        return await permissionService.isCameraPermissionPermanentlyDenied();
      case PermissionType.storage:
        return await permissionService.isStoragePermissionPermanentlyDenied();
    }
  }

  /// Requests the permission
  Future<bool> _requestPermission() async {
    switch (permissionType) {
      case PermissionType.location:
        return await permissionService.requestLocationPermission();
      case PermissionType.camera:
        return await permissionService.requestCameraPermission();
      case PermissionType.storage:
        return await permissionService.requestStoragePermission();
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Row(
        children: [
          Icon(_icon, color: Theme.of(context).primaryColor),
          const SizedBox(width: 12),
          Expanded(child: Text(_title)),
        ],
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(_explanation),
          const SizedBox(height: 16),
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber[50],
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: Colors.amber[200]!),
            ),
            child: Row(
              children: [
                Icon(Icons.info_outline, color: Colors.amber[800], size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'You can change this anytime in Settings.',
                    style: TextStyle(
                      color: Colors.amber[900],
                      fontSize: 13,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () {
            Navigator.of(context).pop();
            onDenied?.call();
          },
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () async {
            Navigator.of(context).pop();
            final granted = await _requestPermission();
            if (granted) {
              onGranted?.call();
            } else {
              final isPermanentlyDenied = await _isPermanentlyDenied();
              if (isPermanentlyDenied && context.mounted) {
                _showSettingsDialog(context);
              } else {
                onDenied?.call();
              }
            }
          },
          child: const Text('Allow'),
        ),
      ],
    );
  }

  /// Shows a dialog to open app settings when permission is permanently denied
  void _showSettingsDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.settings, color: Theme.of(context).primaryColor),
            const SizedBox(width: 12),
            const Text('Permission Required'),
          ],
        ),
        content: Text(
          'This permission has been denied. Please enable it in your device settings to use this feature.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.of(context).pop();
              openAppSettings();
              onDenied?.call();
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }
}

/// Shows the permission dialog and returns the result
Future<bool> showPermissionDialog({
  required BuildContext context,
  required PermissionType permissionType,
  PermissionService? permissionService,
  VoidCallback? onGranted,
  VoidCallback? onDenied,
}) async {
  final service = permissionService ?? PermissionService();

  return await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => PermissionDialog(
          permissionType: permissionType,
          permissionService: service,
          onGranted: onGranted,
          onDenied: onDenied,
        ),
      ) ??
      false;
}

/// Shows a location permission dialog with explanation
Future<bool> showLocationPermissionDialog(
  BuildContext context, {
  PermissionService? permissionService,
  VoidCallback? onGranted,
  VoidCallback? onDenied,
}) {
  return showPermissionDialog(
    context: context,
    permissionType: PermissionType.location,
    permissionService: permissionService,
    onGranted: onGranted,
    onDenied: onDenied,
  );
}

/// Shows a camera permission dialog with explanation
Future<bool> showCameraPermissionDialog(
  BuildContext context, {
  PermissionService? permissionService,
  VoidCallback? onGranted,
  VoidCallback? onDenied,
}) {
  return showPermissionDialog(
    context: context,
    permissionType: PermissionType.camera,
    permissionService: permissionService,
    onGranted: onGranted,
    onDenied: onDenied,
  );
}

/// Shows a storage permission dialog with explanation
Future<bool> showStoragePermissionDialog(
  BuildContext context, {
  PermissionService? permissionService,
  VoidCallback? onGranted,
  VoidCallback? onDenied,
}) {
  return showPermissionDialog(
    context: context,
    permissionType: PermissionType.storage,
    permissionService: permissionService,
    onGranted: onGranted,
    onDenied: onDenied,
  );
}