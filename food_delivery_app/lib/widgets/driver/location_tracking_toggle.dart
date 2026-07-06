import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/location_tracking_service.dart';
import '../../services/auth_service.dart';

/// Widget to toggle location tracking on/off for drivers
/// Displays current tracking status and handles permission requests
class LocationTrackingToggle extends StatefulWidget {
  const LocationTrackingToggle({super.key});

  @override
  State<LocationTrackingToggle> createState() => _LocationTrackingToggleState();
}

class _LocationTrackingToggleState extends State<LocationTrackingToggle> {
  bool _isLoading = false;

  Future<void> _toggleTracking(BuildContext context) async {
    final trackingService = context.read<LocationTrackingService>();
    final authService = context.read<AuthService>();
    final driverId = authService.currentUser?.uid;

    if (driverId == null) {
      _showError('Please log in to enable tracking');
      return;
    }

    setState(() => _isLoading = true);

    try {
      if (trackingService.isTracking) {
        // Stop tracking
        await trackingService.stopTracking();
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Location tracking stopped'),
              backgroundColor: Colors.orange,
            ),
          );
        }
      } else {
        // Check and request permission if needed
        final hasPermission = await trackingService.hasBackgroundLocationPermission();
        
        if (!hasPermission) {
          final granted = await trackingService.requestBackgroundLocationPermission();
          
          if (!granted) {
            if (mounted) {
              _showPermissionDialog();
            }
            return;
          }
        }

        // Start tracking
        final started = await trackingService.startTracking(driverId);
        
        if (mounted) {
          if (started) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Location tracking started'),
                backgroundColor: Colors.green,
              ),
            );
          } else {
            _showError('Failed to start tracking. Please check permissions.');
          }
        }
      }
    } catch (e) {
      if (mounted) {
        _showError('Error: $e');
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.red,
      ),
    );
  }

  void _showPermissionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Location Permission Required'),
        content: const Text(
          'Background location access is needed to track your location during deliveries. '
          'This helps customers see where you are and estimate delivery times.\n\n'
          'Please enable "Allow all the time" in app settings.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              // In a real app, you'd open app settings here
              // using a package like app_settings
            },
            child: const Text('Open Settings'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final trackingService = context.watch<LocationTrackingService>();
    final isTracking = trackingService.isTracking;

    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              isTracking ? Icons.location_on : Icons.location_off,
              color: isTracking ? Colors.green : Colors.grey,
              size: 32,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    isTracking ? 'Location Tracking Active' : 'Location Tracking Off',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    isTracking
                        ? 'Your location is being shared with customers'
                        : 'Enable to share your location during deliveries',
                    style: TextStyle(
                      fontSize: 12,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 16),
            _isLoading
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : Switch(
                    value: isTracking,
                    onChanged: (_) => _toggleTracking(context),
                    activeColor: Colors.green,
                  ),
          ],
        ),
      ),
    );
  }
}
