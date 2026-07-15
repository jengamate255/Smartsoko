import 'package:flutter_test/flutter_test.dart';
import 'package:food_delivery_app/models/user.dart';
import 'package:food_delivery_app/utils/role_validator.dart';

void main() {
  group('RoleValidator', () {
    group('isRoleAllowedForApp', () {
      test('customer role should be allowed in customer app', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.customer, 'customer'),
          isTrue,
        );
      });

      test('driver role should be allowed in driver app', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.rider, 'driver'),
          isTrue,
        );
      });

      test('merchant role should be allowed in merchant app', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.merchant, 'merchant'),
          isTrue,
        );
      });

      test('admin role should be allowed in all apps', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.admin, 'customer'),
          isTrue,
        );
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.admin, 'driver'),
          isTrue,
        );
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.admin, 'merchant'),
          isTrue,
        );
      });

      test('customer role should not be allowed in driver app', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.customer, 'driver'),
          isFalse,
        );
      });

      test('customer role should not be allowed in merchant app', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.customer, 'merchant'),
          isFalse,
        );
      });

      test('driver role should not be allowed in customer app', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.rider, 'customer'),
          isFalse,
        );
      });

      test('driver role should not be allowed in merchant app', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.rider, 'merchant'),
          isFalse,
        );
      });

      test('merchant role should not be allowed in customer app', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.merchant, 'customer'),
          isFalse,
        );
      });

      test('merchant role should not be allowed in driver app', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.merchant, 'driver'),
          isFalse,
        );
      });

      test('should handle case-insensitive app types', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.customer, 'CUSTOMER'),
          isTrue,
        );
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.rider, 'Driver'),
          isTrue,
        );
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.merchant, 'MeRcHaNt'),
          isTrue,
        );
      });

      test('should return false for unknown app types', () {
        expect(
          RoleValidator.isRoleAllowedForApp(UserRole.customer, 'unknown'),
          isFalse,
        );
      });
    });

    group('getRoleErrorMessage', () {
      test('should return appropriate error message for customer in driver app', () {
        final message = RoleValidator.getRoleErrorMessage(
          UserRole.customer,
          'driver',
        );
        
        expect(message, contains('customers'));
        expect(message, contains('Driver App'));
      });

      test('should return appropriate error message for driver in customer app', () {
        final message = RoleValidator.getRoleErrorMessage(
          UserRole.rider,
          'customer',
        );
        
        expect(message, contains('drivers'));
        expect(message, contains('Customer App'));
      });

      test('should return appropriate error message for merchant in customer app', () {
        final message = RoleValidator.getRoleErrorMessage(
          UserRole.merchant,
          'customer',
        );
        
        expect(message, contains('merchants'));
        expect(message, contains('Customer App'));
      });

      test('should return special message for admin role', () {
        final message = RoleValidator.getRoleErrorMessage(
          UserRole.admin,
          'customer',
        );
        
        expect(message, contains('Admin access is available in all apps'));
      });
    });

    group('RoleException', () {
      test('should create exception with correct properties', () {
        final exception = RoleException(
          message: 'Test error',
          userRole: UserRole.customer,
          appType: 'driver',
        );

        expect(exception.message, equals('Test error'));
        expect(exception.userRole, equals(UserRole.customer));
        expect(exception.appType, equals('driver'));
      });

      test('should have proper toString representation', () {
        final exception = RoleException(
          message: 'Test error',
          userRole: UserRole.customer,
          appType: 'driver',
        );

        expect(exception.toString(), contains('RoleException'));
        expect(exception.toString(), contains('Test error'));
      });
    });
  });
}
