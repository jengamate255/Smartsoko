import 'package:flutter/material.dart';
import '../../models/restaurant.dart';
import '../../services/analytics_service.dart';
import '../../services/auth_service.dart';
import '../../services/restaurant_service.dart';
import '../../widgets/merchant/menu_item_row.dart';
import 'menu_item_form_screen.dart';

class MenuManagementScreen extends StatefulWidget {
  const MenuManagementScreen({super.key});

  @override
  State<MenuManagementScreen> createState() => _MenuManagementScreenState();
}

class _MenuManagementScreenState extends State<MenuManagementScreen> {
  final AnalyticsService _analyticsService = AnalyticsService();

  final AuthService _authService = AuthService();
  final RestaurantService _restaurantService = RestaurantService();

  Restaurant? _restaurant;
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadRestaurant();
    _logScreenView();
  }

  Future<void> _logScreenView() async {
    await _analyticsService.logScreenView(
      screenName: 'MenuManagement',
      screenClass: 'MenuManagementScreen',
    );
  }

  Future<void> _loadRestaurant() async {
    try {
      final user = _authService.currentUser;
      if (user == null) {
        setState(() {
          _error = 'User not authenticated';
          _isLoading = false;
        });
        return;
      }

      final restaurant = await _restaurantService.getRestaurantByOwnerId(user.uid);
      setState(() {
        _restaurant = restaurant;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _isLoading = false;
      });
    }
  }

  Future<void> _toggleAvailability(String itemId, bool currentStatus) async {
    try {
      await _restaurantService.toggleMenuItemAvailability(itemId, !currentStatus);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating availability: $e')),
        );
      }
    }
  }

  Future<void> _deleteMenuItem(String itemId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Menu Item'),
        content: const Text('Are you sure you want to delete this menu item?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      try {
        await _restaurantService.updateMenuItem(itemId, {'isAvailable': false});
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Menu item deleted')),
          );
        }
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Error deleting menu item: $e')),
          );
        }
      }
    }
  }

  void _navigateToAddItem() {
    if (_restaurant == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MenuItemFormScreen(
          restaurantId: _restaurant!.id,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.error_outline, size: 48, color: Colors.red),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: () {
                setState(() {
                  _isLoading = true;
                  _error = null;
                });
                _loadRestaurant();
              },
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_restaurant == null) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.store, size: 48, color: Colors.grey),
            SizedBox(height: 16),
            Text(
              'No restaurant found',
              style: TextStyle(fontSize: 18, color: Colors.grey),
            ),
            SizedBox(height: 8),
            Text(
              'Please set up your restaurant in settings',
              style: TextStyle(fontSize: 14, color: Colors.grey),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Menu'),
        actions: [
          IconButton(
            icon: const Icon(Icons.add),
            onPressed: _navigateToAddItem,
            tooltip: 'Add Menu Item',
          ),
        ],
      ),
      body: StreamBuilder<List<MenuItem>>(
        stream: _restaurantService.getMenuItems(_restaurant!.id),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(Icons.error_outline, size: 48, color: Colors.red),
                  const SizedBox(height: 16),
                  Text('Error: ${snapshot.error}'),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      setState(() {});
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          final menuItems = snapshot.data ?? [];

          if (menuItems.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.restaurant_menu,
                    size: 60,
                    color: Colors.grey,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    'No menu items',
                    style: TextStyle(fontSize: 18, color: Colors.grey),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Add items to your menu',
                    style: TextStyle(fontSize: 14, color: Colors.grey),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton.icon(
                    onPressed: _navigateToAddItem,
                    icon: const Icon(Icons.add),
                    label: const Text('Add Menu Item'),
                  ),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.symmetric(vertical: 8),
            itemCount: menuItems.length,
            itemBuilder: (context, index) {
              final item = menuItems[index];
              return MenuItemRow(
                menuItem: item,
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => MenuItemFormScreen(
                        menuItem: item,
                        restaurantId: _restaurant!.id,
                      ),
                    ),
                  );
                },
                onToggleAvailability: () => _toggleAvailability(item.id, item.isAvailable),
                onDelete: () => _deleteMenuItem(item.id),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _navigateToAddItem,
        tooltip: 'Add Menu Item',
        child: const Icon(Icons.add),
      ),
    );
  }
}