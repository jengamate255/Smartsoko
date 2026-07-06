import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/user.dart' as user_models;
import '../../services/auth_service.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.read<AuthService>();

    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      appBar: AppBar(
        title: const Text('My Account', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF064E3B),
        elevation: 0,
      ),
      body: FutureBuilder<user_models.User?>(
        future: authService.getUser(authService.currentUser?.uid ?? ''),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          final user = snapshot.data;
          if (user == null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Text('User session expired'),
                  TextButton(onPressed: () => authService.signOut(), child: const Text('Login Again')),
                ],
              ),
            );
          }

          return ListView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
            children: [
              // Profile Header
              Center(
                child: Column(
                  children: [
                    Stack(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(4),
                          decoration: const BoxDecoration(
                            color: Color(0xFF064E3B),
                            shape: BoxShape.circle,
                          ),
                          child: CircleAvatar(
                            radius: 50,
                            backgroundColor: const Color(0xFFC1ECD4),
                            child: Text(
                              (user.name ?? 'U')[0].toUpperCase(),
                              style: const TextStyle(fontSize: 40, fontWeight: FontWeight.bold, color: Color(0xFF064E3B)),
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 0,
                          right: 0,
                          child: Container(
                            padding: const EdgeInsets.all(8),
                            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black12, blurRadius: 4)]),
                            child: const Icon(Icons.camera_alt, size: 20, color: Color(0xFF064E3B)),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      user.name ?? 'Organic User',
                      style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF111827)),
                    ),
                    Text(
                      user.phone,
                      style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 32),

              // Settings Section
              const Text('Account Settings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
              const SizedBox(height: 16),
              _buildSettingsCard([
                _buildListTile(Icons.person_outline, 'Personal Information', () {}),
                _buildListTile(Icons.location_on_outlined, 'Saved Addresses', () {}),
                _buildListTile(Icons.payment_outlined, 'Payment Methods', () {}),
              ]),

              const SizedBox(height: 24),
              const Text('General', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
              const SizedBox(height: 16),
              _buildSettingsCard([
                _buildListTile(Icons.help_outline, 'Help & Support', () {}),
                _buildListTile(Icons.info_outline, 'About Organic Curator', () {}),
                _buildListTile(Icons.policy_outlined, 'Privacy Policy', () {}),
              ]),

              const SizedBox(height: 40),
              SizedBox(
                width: double.infinity,
                child: TextButton(
                  onPressed: () => authService.signOut(),
                  style: TextButton.styleFrom(
                    foregroundColor: Colors.red[700],
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    backgroundColor: Colors.red[50],
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text('Sign Out', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
              const SizedBox(height: 60),
            ],
          );
        },
      ),
    );
  }

  Widget _buildSettingsCard(List<Widget> children) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 10, offset: const Offset(0, 4))],
      ),
      child: Column(children: children),
    );
  }

  Widget _buildListTile(IconData icon, String title, VoidCallback onTap) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(10)),
        child: Icon(icon, size: 22, color: const Color(0xFF064E3B)),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 15)),
      trailing: const Icon(Icons.chevron_right, size: 20, color: Colors.grey),
      onTap: onTap,
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}
