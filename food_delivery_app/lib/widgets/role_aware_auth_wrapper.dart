import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../config/app_config.dart';
import '../utils/role_validator.dart';
import '../models/user.dart' as models;

/// Widget that wraps authentication and validates user role against app type
/// 
/// This widget checks if the authenticated user's role matches the current
/// app type and displays an error screen if there's a mismatch.
class RoleAwareAuthWrapper extends StatelessWidget {
  final Widget loginScreen;
  final Widget mainScreen;

  const RoleAwareAuthWrapper({
    super.key,
    required this.loginScreen,
    required this.mainScreen,
  });

  @override
  Widget build(BuildContext context) {
    final authService = context.read<AuthService>();

    return StreamBuilder(
      stream: authService.authStateChanges,
      builder: (context, snapshot) {
        // Show loading while checking authentication
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(
              child: CircularProgressIndicator(),
            ),
          );
        }

        // Show login screen if not authenticated
        if (!snapshot.hasData || snapshot.data == null) {
          return loginScreen;
        }

        final user = snapshot.data!;
        final appType = AppConfig.appType;

        // Validate role against app type
        if (!RoleValidator.isRoleAllowedForApp(user.role, appType)) {
          return _RoleErrorScreen(
            userRole: user.role,
            appType: appType,
          );
        }

        // Show main screen if role matches
        return mainScreen;
      },
    );
  }
}

/// Error screen displayed when user role doesn't match app type
class _RoleErrorScreen extends StatelessWidget {
  final models.UserRole userRole;
  final String appType;

  const _RoleErrorScreen({
    required this.userRole,
    required this.appType,
  });

  @override
  Widget build(BuildContext context) {
    final errorMessage = RoleValidator.getRoleErrorMessage(userRole, appType);
    final authService = context.read<AuthService>();

    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.block,
                size: 80,
                color: Colors.red[400],
              ),
              const SizedBox(height: 24),
              const Text(
                'Access Denied',
                style: TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                errorMessage,
                textAlign: TextAlign.center,
                style: const TextStyle(fontSize: 16),
              ),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () async {
                  await authService.signOut();
                },
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 32,
                    vertical: 16,
                  ),
                ),
                child: const Text('Sign Out'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
