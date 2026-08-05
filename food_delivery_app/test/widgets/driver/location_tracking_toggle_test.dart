import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:food_delivery_app/widgets/driver/location_tracking_toggle.dart';
import 'package:food_delivery_app/services/location_tracking_service.dart';
import 'package:food_delivery_app/services/location_service.dart';
import 'package:food_delivery_app/services/auth_service.dart';
import 'package:food_delivery_app/models/user.dart';

// Mock services for testing
class MockLocationService extends LocationService {}

class MockAuthService extends AuthService {
  User? _mockUser;

  void setMockUser(User? user) {
    _mockUser = user;
  }

  @override
  User? get currentUser => _mockUser;
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
      child: const MaterialApp(
        home: Scaffold(
          body: LocationTrackingToggle(),
        ),
      ),
    );
  }

  group('LocationTrackingToggle Widget', () {
    testWidgets('should display tracking off initially', (tester) async {
      await tester.pumpWidget(createTestWidget());

      expect(find.text('Location Tracking Off'), findsOneWidget);
      expect(find.text('Enable to share your location during deliveries'), findsOneWidget);
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

    testWidgets('should display correct icon based on tracking state', (tester) async {
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
