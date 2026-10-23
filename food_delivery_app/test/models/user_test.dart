import 'package:flutter_test/flutter_test.dart';
import 'package:smartsoko/models/user.dart';

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

  group('User.fromApiProfile', () {
    test('maps the API server payload (phone_number, role)', () {
      final user = User.fromApiProfile({
        'id': '62f63314-16e4-4347-8248-4bda8bba6abb',
        'phone_number': '255712345678',
        'name': 'Asha',
        'email': 'asha@example.com',
        'image_url': null,
        'role': 'merchant',
        'is_verified': true,
      }, fallbackId: 'AbCdEf1234567890');

      expect(user.id, '62f63314-16e4-4347-8248-4bda8bba6abb');
      expect(user.phone, '255712345678');
      expect(user.name, 'Asha');
      expect(user.email, 'asha@example.com');
      expect(user.role, UserRole.merchant);
    });

    test('unknown or missing role falls back to customer', () {
      final user = User.fromApiProfile({
        'phone_number': '255700000000',
      }, fallbackId: 'uid-1');

      expect(user.role, UserRole.customer);
      expect(user.id, 'uid-1');
      expect(user.phone, '255700000000');
    });
  });
}
