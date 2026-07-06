import 'package:flutter/material.dart';
import '../../widgets/offline_indicator.dart';
import 'restaurant_list_screen.dart';
import 'order_history_screen.dart';
import 'customer_profile_screen.dart';

class CustomerMainScreen extends StatefulWidget {
  const CustomerMainScreen({super.key});

  @override
  State<CustomerMainScreen> createState() => _CustomerMainScreenState();
}

class _CustomerMainScreenState extends State<CustomerMainScreen> {
  int _currentIndex = 0;

  final List<Widget> _screens = const [
    RestaurantListScreen(),
    OrderHistoryScreen(),
    CustomerProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
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
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.restaurant),
            label: 'Restaurants',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
