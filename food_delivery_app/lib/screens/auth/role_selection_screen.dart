import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/analytics_service.dart';
import '../../models/user.dart';

class RoleSelectionScreen extends StatefulWidget {
  final String phoneNumber;

  const RoleSelectionScreen({
    super.key,
    required this.phoneNumber,
  });

  @override
  State<RoleSelectionScreen> createState() => _RoleSelectionScreenState();
}

class _RoleSelectionScreenState extends State<RoleSelectionScreen> {
  UserRole? _selectedRole;
  bool _isLoading = false;
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    final analytics = context.read<AnalyticsService>();
    analytics.logScreenView(
      screenName: 'Role Selection',
      screenClass: 'RoleSelectionScreen',
    );
  }

  @override
  void dispose() {
    super.dispose();
  }

  Future<void> _continueWithRole() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      
      // Check if user already exists
      final normalizedPhone = authService._normalizePhone(widget.phoneNumber);
      final existingUserDoc = await authService._firestore
          .collection(AppConfig.usersCollection)
          .where('phone', isEqualTo: normalizedPhone)
          .limit(1)
          .get();

      if (existingUserDoc.docs.isNotEmpty) {
        // User exists, just authenticate them
        await authService.signInWithPhone(widget.phoneNumber);
      } else {
        // New user - create with selected role
        final newUser = User(
          id: '',
          phone: normalizedPhone,
          role: _selectedRole!,
          createdAt: DateTime.now(),
        );

        final docRef = await authService._firestore
            .collection(AppConfig.usersCollection)
            .add(newUser.toFirestore());

        final createdUser = User(
          id: docRef.id,
          phone: normalizedPhone,
          role: _selectedRole!,
          createdAt: DateTime.now(),
        );

        // Update the auth service user
        authService.user = createdUser;
        
        // Also create in Supabase for sync
        try {
          await authService._supabaseService.client.from('profiles').insert({
            'id': createdUser.id,
            'phone': normalizedPhone,
            'role': _selectedRole!.name,
          });
        } catch (e) {
          // Log but don't fail - Firebase is primary
          AppLogger.warning('Failed to sync new user to Supabase: $e');
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.fastfood,
                  size: 80,
                  color: Color(0xFF064E3B),
                ),
                const SizedBox(height: 24),
                const Text(
                  'SmartSoko',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Select your role to continue',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                Text(
                  'Phone: ${widget.phoneNumber}',
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 32),
                _buildRoleOption(
                  Icons.person,
                  'Customer',
                  'Browse and order from local vendors',
                  UserRole.customer,
                ),
                const SizedBox(height: 16),
                _buildRoleOption(
                  Icons.store,
                  'Merchant',
                  'Sell your products and manage orders',
                  UserRole.merchant,
                ),
                const SizedBox(height: 16),
                _buildRoleOption(
                  Icons.directions_bike,
                  'Driver',
                  'Deliver orders and earn money',
                  UserRole.rider,
                ),
                const SizedBox(height: 32),
                ElevatedButton(
                  onPressed: _isLoading || _selectedRole == null ? null : _continueWithRole,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF064E3B),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Continue'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildRoleOption(IconData icon, String title, String description, UserRole role) {
    final isSelected = _selectedRole == role;
    
    return InkWell(
      onTap: () {
        setState(() => _selectedRole = role);
      },
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(
            color: isSelected ? const Color(0xFF064E3B) : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(12),
          color: isSelected ? const Color(0xFF064E3B).withValues(alpha:0.05) : null,
        ),
        child: Row(
          children: [
            Icon(icon, size: 28, color: isSelected ? const Color(0xFF064E3B) : Colors.grey[700]),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? const Color(0xFF064E3B) : Colors.grey[800],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    description,
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                ],
              ),
            ),
            if (isSelected)
              const Icon(
                Icons.check_circle,
                color: Color(0xFF064E3B),
                size: 24,
              ),
          ],
        ),
      ),
    );
  }
}