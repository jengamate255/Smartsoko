import '../models/user.dart';

/// Utility class for validating user roles against app types
class RoleValidator {
  /// Check if a user role is allowed for a specific app type
  /// 
  /// Returns true if the role matches the app type:
  /// - customer role -> customer app
  /// - rider role -> driver app
  /// - merchant role -> merchant app
  /// - admin role -> allowed in all apps
  static bool isRoleAllowedForApp(UserRole role, String appType) {
    switch (appType.toLowerCase()) {
      case 'customer':
        return role == UserRole.customer || role == UserRole.admin;
      case 'driver':
        return role == UserRole.rider || role == UserRole.admin;
      case 'merchant':
        return role == UserRole.merchant || role == UserRole.admin;
      default:
        return false;
    }
  }

  /// Get an appropriate error message for role mismatch
  /// 
  /// Returns a user-friendly error message explaining which app
  /// the user should use based on their role
  static String getRoleErrorMessage(UserRole role, String appType) {
    final currentApp = _getAppDisplayName(appType);
    final correctApp = _getCorrectAppForRole(role);
    
    if (role == UserRole.admin) {
      return 'Admin access is available in all apps.';
    }
    
    return 'This account is for $correctApp. '
           'You are trying to access the $currentApp. '
           'Please download and use the correct app for your account type.';
  }

  /// Get display name for app type
  static String _getAppDisplayName(String appType) {
    switch (appType.toLowerCase()) {
      case 'customer':
        return 'Customer App';
      case 'driver':
        return 'Driver App';
      case 'merchant':
        return 'Merchant App';
      default:
        return 'Unknown App';
    }
  }

  /// Get the correct app name for a given role
  static String _getCorrectAppForRole(UserRole role) {
    switch (role) {
      case UserRole.customer:
        return 'customers';
      case UserRole.rider:
        return 'drivers';
      case UserRole.merchant:
        return 'merchants';
      case UserRole.admin:
        return 'administrators';
    }
  }
}

/// Exception thrown when a user tries to access an app with wrong role
class RoleException implements Exception {
  final String message;
  final UserRole userRole;
  final String appType;

  RoleException({
    required this.message,
    required this.userRole,
    required this.appType,
  });

  @override
  String toString() => 'RoleException: $message';
}
