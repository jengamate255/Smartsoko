import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:smartsoko/services/analytics_service.dart';
import 'package:smartsoko/screens/merchant/merchant_login_screen.dart';

/// Minimal AnalyticsService double. The real service constructs
/// `FirebaseAnalytics.instance`, which requires an initialised Firebase app,
/// so it cannot be instantiated in a widget test. The screen only calls
/// [logScreenView], but the whole interface is implemented so the fake can be
/// provided in place of the real service.
class _FakeAnalyticsService implements AnalyticsService {
  @override
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {}

  @override
  Future<void> logOrderPlaced({
    required String orderId,
    required double orderTotal,
    required int itemCount,
  }) async {}

  @override
  Future<void> logDeliveryCompleted({
    required String orderId,
    int? deliveryDurationMinutes,
    String? driverId,
    double? orderTotal,
    String? deliveryAddress,
  }) async {}

  @override
  Future<void> logOrderConfirmed({
    required String orderId,
    int? estimatedPrepTimeMinutes,
  }) async {}

  @override
  Future<void> logEvent({
    required String name,
    Map<String, dynamic>? parameters,
  }) async {}

  @override
  Future<void> setUserId(String? userId) async {}

  @override
  Future<void> setUserProperty({
    required String name,
    required String value,
  }) async {}
}

void main() {
  Future<void> pumpLoginScreen(WidgetTester tester) {
    return tester.pumpWidget(
      Provider<AnalyticsService>.value(
        value: _FakeAnalyticsService(),
        child: const MaterialApp(home: MerchantLoginScreen()),
      ),
    );
  }

  group('MerchantLoginScreen - UI Components', () {
    testWidgets('displays merchant branding', (tester) async {
      await pumpLoginScreen(tester);

      expect(find.text('SmartSoko - Merchant'), findsOneWidget);
      expect(find.text('Ingia ili usimamie biashara yako'), findsOneWidget);
      expect(find.byIcon(Icons.store), findsOneWidget);
    });

    testWidgets('displays phone input field with correct properties', (
      tester,
    ) async {
      await pumpLoginScreen(tester);

      expect(find.byType(TextFormField), findsOneWidget);
      expect(find.text('Phone Number'), findsOneWidget);
      expect(find.text('07XXXXXXXX'), findsOneWidget); // Hint text
      expect(find.byIcon(Icons.phone), findsOneWidget);
    });

    testWidgets('displays sign in button', (tester) async {
      await pumpLoginScreen(tester);

      expect(
        find.widgetWithText(ElevatedButton, 'Ingia (Login)'),
        findsOneWidget,
      );
      expect(find.text('Huna akaunti? Sajili biashara yako'), findsOneWidget);
    });

    testWidgets('phone input has correct keyboard type', (tester) async {
      await pumpLoginScreen(tester);

      final textField = tester.widget<TextField>(
        find.descendant(
          of: find.byType(TextFormField),
          matching: find.byType(TextField),
        ),
      );
      expect(textField.keyboardType, equals(TextInputType.phone));
    });
  });

  group('MerchantLoginScreen - Form Validation', () {
    testWidgets('validates empty phone number', (tester) async {
      await pumpLoginScreen(tester);

      // Tap sign in without entering phone
      await tester.tap(find.widgetWithText(ElevatedButton, 'Ingia (Login)'));
      await tester.pump();

      // Should show validation error
      expect(find.text('Tafadhali jaza namba ya simu'), findsOneWidget);
    });

    testWidgets('validates invalid phone number format', (tester) async {
      await pumpLoginScreen(tester);

      // Enter invalid phone
      await tester.enterText(find.byType(TextFormField), '123');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Ingia (Login)'));
      await tester.pump();

      // Should show validation error
      expect(find.textContaining('namba ya simu sahihi'), findsOneWidget);
    });

    testWidgets('accepts valid phone number format', (tester) async {
      await pumpLoginScreen(tester);

      // Enter valid phone
      await tester.enterText(find.byType(TextFormField), '0712345678');

      // Manually validate the form
      final formState = tester.state<FormState>(find.byType(Form));
      final isValid = formState.validate();

      expect(isValid, isTrue);
    });
  });

  group('MerchantLoginScreen - Widget Structure', () {
    testWidgets('has correct widget hierarchy', (tester) async {
      await pumpLoginScreen(tester);

      expect(find.byType(Scaffold), findsOneWidget);
      expect(find.byType(SafeArea), findsOneWidget);
      expect(find.byType(Form), findsOneWidget);
      expect(find.byType(SingleChildScrollView), findsOneWidget);
    });

    testWidgets('uses consistent spacing', (tester) async {
      await pumpLoginScreen(tester);

      // Check for SizedBox widgets used for spacing
      expect(find.byType(SizedBox), findsWidgets);
    });
  });
}
