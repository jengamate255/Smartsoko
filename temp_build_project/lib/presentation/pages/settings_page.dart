import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:temp_build_project/presentation/providers/theme_provider.dart';

class SettingsPage extends ConsumerWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final themeMode = ref.watch(themeModeProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          _SettingsSection(
            title: 'App Preferences',
            children: [
              SwitchListTile(
                secondary: Icon(
                  themeMode == ThemeMode.dark
                      ? Icons.dark_mode
                      : Icons.light_mode,
                  color: Colors.grey.shade600,
                ),
                title: const Text('Dark Mode'),
                subtitle: const Text('Switch between light and dark theme'),
                value: themeMode == ThemeMode.dark,
                onChanged: (value) {
                  ref.read(themeModeProvider.notifier).setDark(value);
                },
              ),
              const Divider(height: 1, indent: 72),
              ListTile(
                leading: Icon(Icons.language, color: Colors.grey.shade600),
                title: const Text('Language'),
                subtitle: const Text('English'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {},
              ),
              const Divider(height: 1, indent: 72),
              ListTile(
                leading: Icon(Icons.notifications_outlined, color: Colors.grey.shade600),
                title: const Text('Notifications'),
                subtitle: const Text('Manage notification preferences'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {},
              ),
            ],
          ),
          const SizedBox(height: 16),
          _SettingsSection(
            title: 'Account',
            children: [
              ListTile(
                leading: Icon(Icons.lock_outline, color: Colors.grey.shade600),
                title: const Text('Privacy'),
                subtitle: const Text('Manage your data and privacy'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {},
              ),
              const Divider(height: 1, indent: 72),
              ListTile(
                leading: Icon(Icons.delete_outline, color: Colors.red.shade400),
                title: Text('Delete Account', style: TextStyle(color: Colors.red.shade400)),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {},
              ),
            ],
          ),
          const SizedBox(height: 16),
          _SettingsSection(
            title: 'About',
            children: [
              ListTile(
                leading: Icon(Icons.info_outline, color: Colors.grey.shade600),
                title: const Text('App Version'),
                subtitle: const Text('1.0.0'),
              ),
              const Divider(height: 1, indent: 72),
              ListTile(
                leading: Icon(Icons.description_outlined, color: Colors.grey.shade600),
                title: const Text('Terms of Service'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {},
              ),
              const Divider(height: 1, indent: 72),
              ListTile(
                leading: Icon(Icons.privacy_tip_outlined, color: Colors.grey.shade600),
                title: const Text('Privacy Policy'),
                trailing: const Icon(Icons.chevron_right),
                onTap: () {},
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SettingsSection extends StatelessWidget {
  final String title;
  final List<Widget> children;

  const _SettingsSection({
    required this.title,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text(
            title,
            style: theme.textTheme.titleSmall?.copyWith(
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade600,
            ),
          ),
        ),
        Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          decoration: BoxDecoration(
            color: theme.cardTheme.color,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.grey.shade200),
          ),
          child: Column(children: children),
        ),
      ],
    );
  }
}
