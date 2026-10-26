import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:smartsoko/models/user.dart' as user_models;
import 'package:smartsoko/services/auth_service.dart';
import 'package:smartsoko/utils/app_localizations.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.read<AuthService>();

    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      appBar: AppBar(
        title: Text(context.tr('my_account'), style: const TextStyle(fontWeight: FontWeight.bold)),
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
                  Text(context.tr('user_session_expired')),
                  TextButton(onPressed: () => authService.signOut(), child: Text(context.tr('login_again'))),
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
              Text(context.tr('account_settings'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
              const SizedBox(height: 16),
              _buildSettingsCard([
                _buildListTile(Icons.person_outline, context.tr('personal_information'), () {}),
                _buildListTile(Icons.location_on_outlined, context.tr('saved_addresses'), () {}),
                _buildListTile(Icons.payment_outlined, context.tr('payment_methods'), () {}),
              ]),

              const SizedBox(height: 24),
              Text(context.tr('general'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF111827))),
              const SizedBox(height: 16),
              _buildSettingsCard([
                _buildLanguageTile(context),
                _buildListTile(Icons.help_outline, context.tr('help_support'), () {}),
                _buildListTile(Icons.info_outline, 'About Organic Curator', () {}),
                _buildListTile(Icons.policy_outlined, context.tr('privacy_policy'), () {}),
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
                  child: Text(context.tr('sign_out'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
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

  Widget _buildLanguageTile(BuildContext context) {
    final languageService = context.watch<LanguageService>();

    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(color: const Color(0xFFF3F4F6), borderRadius: BorderRadius.circular(10)),
        child: const Icon(Icons.language_outlined, size: 22, color: Color(0xFF064E3B)),
      ),
      title: Text(context.tr('language'), style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 15)),
      trailing: DropdownButton<String>(
        value: languageService.currentLanguage,
        borderRadius: BorderRadius.circular(16),
        underline: const SizedBox.shrink(),
        items: const [
          DropdownMenuItem(value: 'sw', child: Text('Kiswahili')),
          DropdownMenuItem(value: 'en', child: Text('English')),
        ],
        onChanged: (language) {
          if (language != null) context.read<LanguageService>().setLanguage(language);
        },
      ),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
    );
  }
}
