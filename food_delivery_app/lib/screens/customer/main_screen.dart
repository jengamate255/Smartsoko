import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/analytics_service.dart';
import 'discovery_screen.dart';
import 'home_screen.dart';
import 'orders_screen.dart';
import 'profile_screen.dart';

class MainScreen extends StatefulWidget {
  const MainScreen({super.key});

  @override
  State<MainScreen> createState() => _MainScreenState();
}

class _MainScreenState extends State<MainScreen> {
  int _currentIndex = 1;

  final List<Widget> _screens = [
    const DiscoveryScreen(),
    const HomeScreen(),
    const OrdersScreen(),
    const ProfileScreen(),
  ];

  final List<String> _screenNames = [
    'Discovery',
    'Home',
    'Orders',
    'Profile',
  ];

  @override
  void initState() {
    super.initState();
    _logScreenView('Main');
  }

  void _logScreenView(String screenName) {
    final analytics = context.read<AnalyticsService>();
    analytics.logScreenView(screenName: screenName);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFFFBF9F5).withOpacity(0.8),
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(48),
            topRight: Radius.circular(48),
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 24,
              offset: const Offset(0, -8),
            ),
          ],
        ),
        child: ClipRRect(
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(48),
            topRight: Radius.circular(48),
          ),
          child: NavigationBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            selectedIndex: _currentIndex,
            onDestinationSelected: (index) {
              setState(() => _currentIndex = index);
              _logScreenView(_screenNames[index]);
            },
            indicatorColor: const Color(0xFFC1ECD4),
            labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
            destinations: const [
              NavigationDestination(
                icon: Icon(Icons.home_outlined),
                selectedIcon: Icon(Icons.home),
                label: 'Home',
              ),
              NavigationDestination(
                icon: Icon(Icons.search_outlined),
                selectedIcon: Icon(Icons.search),
                label: 'Search',
              ),
              NavigationDestination(
                icon: Icon(Icons.shopping_cart_outlined),
                selectedIcon: Icon(Icons.shopping_cart),
                label: 'Cart',
              ),
              NavigationDestination(
                icon: Icon(Icons.person_outline),
                selectedIcon: Icon(Icons.person),
                label: 'Profile',
              ),
            ],
          ),
        ),
      ),
    );
  }
}
