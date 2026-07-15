import 'package:flutter_test/flutter_test.dart';
import 'package:food_delivery_app/models/user.dart';

void main() {
  group('User Model - Merchant Role', () {
    test('merchant role should be included in UserRole enum', () {
      // Verify merchant is a valid UserRole value
      expect(UserRole.values, contains(UserRole.merchant));
      expect(UserRole.merchant.name, equals('merchant'));
    });

    test('should serialize merchant role correctly', () {
      // Create a user with merchant role
      final merchantUser = User(
        id: 'test-merchant-id',
        phone: '255712345678',
        name: 'Test Merchant',
        email: 'merchant@test.com',
        role: UserRole.merchant,
        createdAt: DateTime.now(),
      );

      // Serialize to Firestore format
      final firestoreData = merchantUser.toFirestore();

      // Verify role is serialized as 'merchant'
      expect(firestoreData['role'], equals('merchant'));
      expect(firestoreData['phone'], equals('255712345678'));
      expect(firestoreData['name'], equals('Test Merchant'));
    });

    test('should handle all UserRole enum values including merchant', () {
      // Verify all roles can be serialized correctly
      final roles = [
        UserRole.customer,
        UserRole.rider,
        UserRole.admin,
        UserRole.merchant,
      ];

      for (final role in roles) {
        final user = User(
          id: 'test-id',
          phone: '255712345678',
          role: role,
          createdAt: DateTime.now(),
        );

        final firestoreData = user.toFirestore();
        expect(firestoreData['role'], equals(role.name));
      }
    });

    test('merchant role name should match string representation', () {
      // Verify the merchant role serializes to the correct string
      expect(UserRole.merchant.name, equals('merchant'));
      
      // Verify it can be found in the enum values by name
      final foundRole = UserRole.values.firstWhere(
        (e) => e.name == 'merchant',
        orElse: () => UserRole.customer,
      );
      expect(foundRole, equals(UserRole.merchant));
    });
  });
}
