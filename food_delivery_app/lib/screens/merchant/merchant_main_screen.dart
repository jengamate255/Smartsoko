import 'package:flutter/material.dart';
import '../../services/analytics_service.dart';
import '../../widgets/offline_indicator.dart';
import 'merchant_order_list_screen.dart';
import 'menu_management_screen.dart';
import 'restaurant_settings_screen.dart';

class MerchantMainScreen extends StatefulWidget {
  const MerchantMainScreen({super.key});

  @override
  State<MerchantMainScreen> createState() => _MerchantMainScreenState();
}

class _MerchantMainScreenState extends State<MerchantMainScreen> {
  int _currentIndex = 0;
  final AnalyticsService _analyticsService = AnalyticsService();

  final List<Widget> _screens = const [
    _OrdersTab(),
    _MenuTab(),
    _SettingsTab(),
  ];

  @override
  void initState() {
    super.initState();
    _logScreenView('MerchantMain');
  }

  Future<void> _logScreenView(String screenName) async {
    await _analyticsService.logScreenView(
      screenName: screenName,
      screenClass: screenName,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_currentIndex == 0 ? 'Orders' : _currentIndex == 1 ? 'Menu' : 'Settings'),
      ),
      body: Column(
        children: [
          const AnimatedOfflineIndicator(),
          Expanded(
            child: _screens[_currentIndex],
          ),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
          final screenNames = ['MerchantOrders', 'MerchantMenu', 'MerchantSettings'];
          _logScreenView(screenNames[index]);
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.restaurant_menu),
            label: 'Menu',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.settings),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

class _OrdersTab extends StatelessWidget {
  const _OrdersTab();

  @override
  Widget build(BuildContext context) {
    return const MerchantOrderListScreen();
  }
}

class _MenuTab extends StatelessWidget {
  const _MenuTab();

  @override
  Widget build(BuildContext context) {
    return const MenuManagementScreen();
  }
}

class _SettingsTab extends StatelessWidget {
  const _SettingsTab();

  @override
  Widget build(BuildContext context) {
    return ListView(
      children: [
        ListTile(
          leading: const Icon(Icons.store),
          title: const Text('Restaurant Info'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const RestaurantSettingsScreen(),
              ),
            );
          },
        ),
        ListTile(
          leading: const Icon(Icons.schedule),
          title: const Text('Operating Hours'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => const RestaurantSettingsScreen(),
              ),
            );
          },
        ),
        const Divider(),
        ListTile(
          leading: const Icon(Icons.person),
          title: const Text('Profile'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {
            // Navigate to profile screen
          },
        ),
        ListTile(
          leading: const Icon(Icons.logout, color: Colors.red),
          title: const Text('Logout', style: TextStyle(color: Colors.red)),
          onTap: () async {
            final authService = Provider.of<AuthService>(context, listen: false);
            await authService.signOut();
          },
        ),
      ],
    );
  }
}
