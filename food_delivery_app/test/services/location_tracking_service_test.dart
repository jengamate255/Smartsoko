import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:smartsoko/services/location_tracking_service.dart';
import 'package:smartsoko/services/location_service.dart';

// Simple mock for LocationService. Implemented rather than extended so the
// Firestore field initializer on the real service is never constructed.
class MockLocationService implements LocationService {
  Position? _mockPosition;
  Exception? _mockError;
  bool _updateCalled = false;

  void setMockPosition(Position position) {
    _mockPosition = position;
  }

  void setMockError(Exception error) {
    _mockError = error;
  }

  bool get updateCalled => _updateCalled;

  @override
  Future<Position?> getCurrentPosition() async {
    if (_mockError != null) {
      throw _mockError!;
    }
    return _mockPosition;
  }

  @override
  Future<void> updateRiderLocation(
    String riderId,
    double lat,
    double lng, {
    bool isOnline = true,
  }) async {
    _updateCalled = true;
  }

  // The remaining LocationService members are not exercised by these tests.
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // permission_handler talks to the host over this channel. With no plugin in
  // the test environment every call would throw MissingPluginException, so
  // answer status checks with "denied" to model an unpermissioned device.
  const permissionChannel = MethodChannel(
    'flutter.baseflow.com/permissions/methods',
  );

  late LocationTrackingService trackingService;
  late MockLocationService mockLocationService;

  setUp(() {
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(permissionChannel, (call) async {
          if (call.method == 'checkPermissionStatus') {
            return 0; // PermissionStatus.denied
          }
          return null;
        });

    mockLocationService = MockLocationService();
    trackingService = LocationTrackingService(mockLocationService);
  });

  tearDown(() {
    trackingService.dispose();
    TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
        .setMockMethodCallHandler(permissionChannel, null);
  });

  group('LocationTrackingService', () {
    test('should not be tracking initially', () {
      expect(trackingService.isTracking, false);
      expect(trackingService.currentDriverId, null);
    });

    test('should initialize correctly', () {
      expect(trackingService.isTracking, false);
      expect(trackingService.currentDriverId, null);
    });

    test('should stop tracking and set driver offline', () async {
      final position = Position(
        latitude: -1.2921,
        longitude: 36.8219,
        timestamp: DateTime.now(),
        accuracy: 10.0,
        altitude: 0.0,
        heading: 0.0,
        speed: 0.0,
        speedAccuracy: 0.0,
        altitudeAccuracy: 0.0,
        headingAccuracy: 0.0,
      );

      mockLocationService.setMockPosition(position);

      await trackingService.stopTracking();

      expect(trackingService.isTracking, false);
      expect(trackingService.currentDriverId, null);
    });

    test('should handle location update errors gracefully', () async {
      mockLocationService.setMockError(Exception('Location error'));

      // Should not throw when stopping tracking
      await expectLater(trackingService.stopTracking(), completes);
    });

    test('dispose should clean up resources', () {
      trackingService.dispose();

      expect(trackingService.isTracking, false);
      expect(trackingService.currentDriverId, null);
    });

    test(
      'should return false for hasBackgroundLocationPermission initially',
      () async {
        // This will return false in test environment without proper permission setup
        final hasPermission = await trackingService
            .hasBackgroundLocationPermission();
        expect(hasPermission, false);
      },
    );
  });
}
