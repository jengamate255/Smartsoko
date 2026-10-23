import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:geolocator/geolocator.dart';
import 'package:provider/provider.dart';
import 'package:smartsoko/widgets/driver/location_tracking_toggle.dart';
import 'package:smartsoko/services/location_tracking_service.dart';
import 'package:smartsoko/services/location_service.dart';
import 'package:smartsoko/services/auth_service.dart';

// Mocks are `implements` rather than `extends`: the real services touch
// Firebase in field initializers, and there is no Firebase app in tests. The
// `noSuchMethod` forwarders cover the members these tests never call.
class MockLocationService implements LocationService {
  @override
  Future<Position?> getCurrentPosition() async => null;

  @override
  Future<void> updateRiderLocation(
    String riderId,
    double lat,
    double lng, {
    bool isOnline = true,
  }) async {}

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class MockAuthService implements AuthService {
  firebase_auth.User? _mockUser;

  void setMockUser(firebase_auth.User? user) {
    _mockUser = user;
  }

  @override
  firebase_auth.User? get currentUser => _mockUser;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

void main() {
  late MockLocationService mockLocationService;
  late LocationTrackingService trackingService;
  late MockAuthService mockAuthService;

  setUp(() {
    mockLocationService = MockLocationService();
    trackingService = LocationTrackingService(mockLocationService);
    mockAuthService = MockAuthService();
  });

  tearDown(() {
    trackingService.dispose();
  });

  Widget createTestWidget() {
    return MultiProvider(
      providers: [
        Provider<LocationTrackingService>.value(value: trackingService),
        Provider<AuthService>.value(value: mockAuthService),
      ],
      child: const MaterialApp(home: Scaffold(body: LocationTrackingToggle())),
    );
  }

  group('LocationTrackingToggle Widget', () {
    testWidgets('should display tracking off initially', (tester) async {
      await tester.pumpWidget(createTestWidget());

      expect(find.text('Location Tracking Off'), findsOneWidget);
      expect(
        find.text('Enable to share your location during deliveries'),
        findsOneWidget,
      );
      expect(find.byIcon(Icons.location_off), findsOneWidget);
    });

    testWidgets('should display switch widget', (tester) async {
      await tester.pumpWidget(createTestWidget());

      expect(find.byType(Switch), findsOneWidget);

      final switchWidget = tester.widget<Switch>(find.byType(Switch));
      expect(switchWidget.value, false);
    });

    testWidgets('should display tracking status in card', (tester) async {
      await tester.pumpWidget(createTestWidget());

      expect(find.byType(Card), findsOneWidget);
      expect(find.byType(Icon), findsOneWidget);
    });

    testWidgets('should show error when user not logged in', (tester) async {
      mockAuthService.setMockUser(null);

      await tester.pumpWidget(createTestWidget());

      // Tap the switch
      await tester.tap(find.byType(Switch));
      await tester.pumpAndSettle();

      // Should show error snackbar
      expect(find.text('Please log in to enable tracking'), findsOneWidget);
    });

    testWidgets('should display correct icon based on tracking state', (
      tester,
    ) async {
      await tester.pumpWidget(createTestWidget());

      // Initially off
      expect(find.byIcon(Icons.location_off), findsOneWidget);
      expect(find.byIcon(Icons.location_on), findsNothing);
    });

    testWidgets('should display descriptive text', (tester) async {
      await tester.pumpWidget(createTestWidget());

      expect(
        find.text('Enable to share your location during deliveries'),
        findsOneWidget,
      );
    });
  });
}
