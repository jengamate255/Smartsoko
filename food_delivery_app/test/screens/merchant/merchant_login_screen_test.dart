import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:food_delivery_app/screens/merchant/merchant_login_screen.dart';

void main() {
  group('MerchantLoginScreen - UI Components', () {
    testWidgets('displays merchant branding', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MerchantLoginScreen()),
      );

      expect(find.text('Food Delivery'), findsOneWidget);
      expect(find.text('Merchant App'), findsOneWidget);
      expect(find.byIcon(Icons.restaurant), findsOneWidget);
    });

    testWidgets('displays phone input field with correct properties',
        (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MerchantLoginScreen()),
      );

      expect(find.byType(TextFormField), findsOneWidget);
      expect(find.text('Phone Number'), findsOneWidget);
      expect(find.text('0712345678'), findsOneWidget); // Hint text
      expect(find.byIcon(Icons.phone), findsOneWidget);
    });

    testWidgets('displays sign in button', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MerchantLoginScreen()),
      );

      expect(find.widgetWithText(ElevatedButton, 'Sign In'), findsOneWidget);
      expect(
        find.text('Enter your phone number to continue'),
        findsOneWidget,
      );
    });

    testWidgets('phone input has correct keyboard type', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MerchantLoginScreen()),
      );

      final textField = tester.widget<TextFormField>(find.byType(TextFormField));
      expect(textField.keyboardType, equals(TextInputType.phone));
    });
  });

  group('MerchantLoginScreen - Form Validation', () {
    testWidgets('validates empty phone number', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MerchantLoginScreen()),
      );

      // Tap sign in without entering phone
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pump();

      // Should show validation error
      expect(find.text('Phone number is required'), findsOneWidget);
    });

    testWidgets('validates invalid phone number format', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MerchantLoginScreen()),
      );

      // Enter invalid phone
      await tester.enterText(find.byType(TextFormField), '123');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pump();

      // Should show validation error
      expect(find.textContaining('valid phone number'), findsOneWidget);
    });

    testWidgets('accepts valid phone number format', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MerchantLoginScreen()),
      );

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
      await tester.pumpWidget(
        const MaterialApp(home: MerchantLoginScreen()),
      );

      expect(find.byType(Scaffold), findsOneWidget);
      expect(find.byType(SafeArea), findsOneWidget);
      expect(find.byType(Form), findsOneWidget);
      expect(find.byType(SingleChildScrollView), findsOneWidget);
    });

    testWidgets('uses consistent spacing', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MerchantLoginScreen()),
      );

      // Check for SizedBox widgets used for spacing
      expect(find.byType(SizedBox), findsWidgets);
    });
  });
}
