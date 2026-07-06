# Location Tracking Service

## Overview

The `LocationTrackingService` provides background location tracking functionality for delivery drivers. It automatically updates the driver's location in Firestore every 10 seconds, enabling real-time tracking for customers.

## Features

- **Automatic Updates**: Location updates every 10 seconds
- **Background Tracking**: Continues tracking even when app is in background
- **Permission Handling**: Manages foreground and background location permissions
- **Firestore Sync**: Real-time location updates to Firestore
- **Error Handling**: Gracefully handles location errors without stopping tracking
- **Resource Management**: Proper cleanup when tracking stops

## Requirements

### Android Permissions

The following permissions must be declared in `AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE"/>
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION"/>
```

These are already configured in `android/app/src/driver/AndroidManifest.xml`.

### Dependencies

- `geolocator: ^13.0.2` - For location access
- `permission_handler: ^11.3.1` - For permission management
- `cloud_firestore: ^5.6.12` - For Firestore updates

## Usage

### 1. Setup Provider

Add `LocationTrackingService` to your provider tree:

```dart
MultiProvider(
  providers: [
    Provider<LocationService>(create: (_) => LocationService()),
    ProxyProvider<LocationService, LocationTrackingService>(
      update: (_, locationService, __) => LocationTrackingService(locationService),
      dispose: (_, service) => service.dispose(),
    ),
    // ... other providers
  ],
  child: MyApp(),
)
```

### 2. Start Tracking

```dart
final trackingService = context.read<LocationTrackingService>();
final driverId = 'driver-user-id';

// Check permission first
final hasPermission = await trackingService.hasBackgroundLocationPermission();

if (!hasPermission) {
  // Request permission
  final granted = await trackingService.requestBackgroundLocationPermission();
  if (!granted) {
    // Show error or open settings
    return;
  }
}

// Start tracking
final started = await trackingService.startTracking(driverId);
if (started) {
  print('Tracking started successfully');
}
```

### 3. Stop Tracking

```dart
final trackingService = context.read<LocationTrackingService>();
await trackingService.stopTracking();
```

### 4. Check Status

```dart
final trackingService = context.watch<LocationTrackingService>();

if (trackingService.isTracking) {
  print('Currently tracking: ${trackingService.currentDriverId}');
}
```

## UI Integration

Use the `LocationTrackingToggle` widget for easy integration:

```dart
import 'package:food_delivery_app/widgets/driver/location_tracking_toggle.dart';

class DriverMainScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Column(
        children: [
          LocationTrackingToggle(), // Add this widget
          // ... rest of your UI
        ],
      ),
    );
  }
}
```

## Firestore Data Structure

Location data is stored in the `riders` collection:

```
riders/{driverId}
  - lat: number (latitude)
  - lng: number (longitude)
  - updatedAt: timestamp
  - isOnline: boolean
```

## Permission Flow

### Android 10+ (API 29+)

1. **Foreground Permission**: Requested first
   - `ACCESS_FINE_LOCATION`
   - `ACCESS_COARSE_LOCATION`

2. **Background Permission**: Requested after foreground is granted
   - `ACCESS_BACKGROUND_LOCATION`
   - User must select "Allow all the time" in settings

### Permission Dialog

The service automatically shows appropriate dialogs:
- Initial permission request
- Explanation if permission denied
- Guidance to open settings for background permission

## Error Handling

The service handles errors gracefully:

- **Location unavailable**: Logs error, continues tracking
- **Permission denied**: Returns false, stops tracking
- **Firestore error**: Logs error, continues tracking
- **Service disabled**: Returns false from permission check

## Best Practices

### 1. Start Tracking on Login

```dart
// In driver login flow
if (loginSuccessful) {
  final trackingService = context.read<LocationTrackingService>();
  await trackingService.startTracking(driverId);
}
```

### 2. Stop Tracking on Logout

```dart
// In logout flow
final trackingService = context.read<LocationTrackingService>();
await trackingService.stopTracking();
```

### 3. Handle App Lifecycle

```dart
class DriverApp extends StatefulWidget {
  @override
  State<DriverApp> createState() => _DriverAppState();
}

class _DriverAppState extends State<DriverApp> with WidgetsBindingObserver {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.paused) {
      // App in background - tracking continues
    } else if (state == AppLifecycleState.resumed) {
      // App in foreground - tracking continues
    }
  }
}
```

### 4. Battery Optimization

The service updates every 10 seconds, which is a balance between:
- **Accuracy**: Frequent updates for real-time tracking
- **Battery**: Not too frequent to drain battery
- **Data**: Reasonable Firestore write operations

To adjust the interval, modify the `Duration` in `startTracking()`:

```dart
_trackingTimer = Timer.periodic(
  const Duration(seconds: 10), // Change this value
  (_) => _updateLocation(),
);
```

## Testing

### Unit Tests

Run the test suite:

```bash
flutter test test/services/location_tracking_service_test.dart
```

### Manual Testing

1. **Start tracking**: Verify location appears in Firestore
2. **Move device**: Verify location updates every 10 seconds
3. **Background app**: Verify tracking continues
4. **Stop tracking**: Verify `isOnline` set to false
5. **Permission denial**: Verify appropriate error handling

## Troubleshooting

### Location not updating

1. Check location permissions are granted
2. Verify location services enabled on device
3. Check Firestore security rules allow writes
4. Verify driver ID is correct

### Permission denied

1. Check AndroidManifest.xml has required permissions
2. For background location, user must select "Allow all the time"
3. Some devices require additional battery optimization settings

### High battery usage

1. Increase update interval (default 10 seconds)
2. Use lower accuracy (modify LocationService)
3. Stop tracking when driver is not on delivery

## Related Files

- `lib/services/location_service.dart` - Core location functionality
- `lib/models/rider.dart` - RiderLocation model
- `lib/widgets/driver/location_tracking_toggle.dart` - UI widget
- `test/services/location_tracking_service_test.dart` - Unit tests

## Requirements Validation

This service validates the following requirements:

- **Requirement 8.3**: Background location permission handling
- **Requirement 9.6**: Real-time driver location updates for customers
