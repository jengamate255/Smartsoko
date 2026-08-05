import 'package:flutter/material.dart';
import '../../models/restaurant.dart';
import '../../services/analytics_service.dart';
import '../../services/auth_service.dart';
import '../../services/restaurant_service.dart';
import 'csv_import_screen.dart';
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

  bool _selectionMode = false;
  final Set<String> _selectedIds = {};

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

  void _enterSelectionMode(String itemId) {
    setState(() {
      _selectionMode = true;
      _selectedIds.clear();
      _selectedIds.add(itemId);
    });
  }

  void _exitSelectionMode() {
    setState(() {
      _selectionMode = false;
      _selectedIds.clear();
    });
  }

  void _toggleSelection(String itemId) {
    setState(() {
      if (_selectedIds.contains(itemId)) {
        _selectedIds.remove(itemId);
        if (_selectedIds.isEmpty) _selectionMode = false;
      } else {
        _selectedIds.add(itemId);
      }
    });
  }

  void _selectAll(List<MenuItem> items) {
    setState(() {
      if (_selectedIds.length == items.length) {
        _selectedIds.clear();
        _selectionMode = false;
      } else {
        _selectedIds.addAll(items.map((i) => i.id));
      }
    });
  }

  Future<void> _bulkToggleAvailability(bool available) async {
    final count = _selectedIds.length;
    for (final id in _selectedIds) {
      try {
        await _restaurantService.updateMenuItem(id, {'isAvailable': available});
      } catch (_) {}
    }
    _exitSelectionMode();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('$count items ${available ? 'activated' : 'hidden'}'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _bulkDelete() async {
    final count = _selectedIds.length;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Items'),
        content: Text('Delete $count items? This cannot be undone.'),
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
    if (confirmed != true) return;
    for (final id in _selectedIds) {
      try {
        await _restaurantService.updateMenuItem(id, {'isAvailable': false});
      } catch (_) {}
    }
    _exitSelectionMode();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$count items deleted'), backgroundColor: Colors.orange),
      );
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

  void _navigateToAddItem() {
    if (_restaurant == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => MenuItemFormScreen(restaurantId: _restaurant!.id),
      ),
    );
  }

  void _navigateToCsvImport() {
    if (_restaurant == null) return;
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => CsvImportScreen(restaurantId: _restaurant!.id),
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
      appBar: _selectionMode
          ? AppBar(
              leading: IconButton(
                icon: const Icon(Icons.close),
                onPressed: _exitSelectionMode,
              ),
              title: Text('${_selectedIds.length} selected'),
              actions: [
                IconButton(
                  icon: const Icon(Icons.select_all),
                  onPressed: () {},
                  tooltip: 'Select All',
                ),
              ],
            )
          : AppBar(
              title: const Text('Menu'),
              actions: [
                IconButton(
                  icon: const Icon(Icons.upload_file),
                  onPressed: _navigateToCsvImport,
                  tooltip: 'Import CSV',
                ),
                IconButton(
                  icon: const Icon(Icons.add),
                  onPressed: _navigateToAddItem,
                  tooltip: 'Add Menu Item',
                ),
              ],
            ),
      body: StreamBuilder<List<MenuItem>>(
        stream: _restaurantService.getAllMenuItems(_restaurant!.id),
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
                    onPressed: () => setState(() {}),
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
                  const Icon(Icons.restaurant_menu, size: 60, color: Colors.grey),
                  const SizedBox(height: 16),
                  const Text('No menu items', style: TextStyle(fontSize: 18, color: Colors.grey)),
                  const SizedBox(height: 8),
                  const Text('Add items to your menu', style: TextStyle(fontSize: 14, color: Colors.grey)),
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

          return Column(
            children: [
              if (_selectionMode)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: const Color(0xFF064E3B).withOpacity(0.05),
                  child: Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: () => _selectAll(menuItems),
                          icon: Icon(
                            _selectedIds.length == menuItems.length
                                ? Icons.deselect
                                : Icons.select_all,
                          ),
                          label: Text(
                            _selectedIds.length == menuItems.length ? 'Deselect All' : 'Select All',
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              Expanded(
                child: ListView.builder(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  itemCount: menuItems.length,
                  itemBuilder: (context, index) {
                    final item = menuItems[index];
                    final isSelected = _selectedIds.contains(item.id);
                    return _buildMenuItemCard(item, isSelected, menuItems);
                  },
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: _selectionMode
          ? null
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                FloatingActionButton.small(
                  heroTag: 'csv',
                  onPressed: _navigateToCsvImport,
                  backgroundColor: Colors.blue,
                  child: const Icon(Icons.upload_file, color: Colors.white),
                ),
                const SizedBox(height: 8),
                FloatingActionButton(
                  heroTag: 'add',
                  onPressed: _navigateToAddItem,
                  tooltip: 'Add Menu Item',
                  child: const Icon(Icons.add),
                ),
              ],
            ),
      bottomNavigationBar: _selectionMode
          ? BottomAppBar(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  TextButton.icon(
                    onPressed: _selectedIds.isEmpty ? null : () => _bulkToggleAvailability(true),
                    icon: const Icon(Icons.visibility, color: Colors.green),
                    label: const Text('Set Active', style: TextStyle(color: Colors.green)),
                  ),
                  TextButton.icon(
                    onPressed: _selectedIds.isEmpty ? null : () => _bulkToggleAvailability(false),
                    icon: const Icon(Icons.visibility_off, color: Colors.orange),
                    label: const Text('Set Hidden', style: TextStyle(color: Colors.orange)),
                  ),
                  TextButton.icon(
                    onPressed: _selectedIds.isEmpty ? null : _bulkDelete,
                    icon: const Icon(Icons.delete, color: Colors.red),
                    label: const Text('Delete', style: TextStyle(color: Colors.red)),
                  ),
                ],
              ),
            )
          : null,
    );
  }

  Widget _buildMenuItemCard(MenuItem item, bool isSelected, List<MenuItem> allItems) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      color: isSelected ? const Color(0xFF064E3B).withOpacity(0.08) : null,
      child: InkWell(
        onTap: () {
          if (_selectionMode) {
            _toggleSelection(item.id);
          } else {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => MenuItemFormScreen(
                  menuItem: item,
                  restaurantId: _restaurant!.id,
                ),
              ),
            );
          }
        },
        onLongPress: () => _enterSelectionMode(item.id),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              if (_selectionMode)
                Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: Checkbox(
                    value: isSelected,
                    onChanged: (_) => _toggleSelection(item.id),
                    activeColor: const Color(0xFF064E3B),
                  ),
                ),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: item.imageUrl.isNotEmpty
                    ? Image.network(
                        item.imageUrl,
                        width: 60,
                        height: 60,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => _buildPlaceholder(),
                      )
                    : _buildPlaceholder(),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      item.name,
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.description,
                      style: TextStyle(fontSize: 14, color: Colors.grey[600]),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          '\$${item.price.toStringAsFixed(2)}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                        if (item.variants.isNotEmpty) ...[
                          const SizedBox(width: 8),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.green[100],
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              '${item.variants.length} variants',
                              style: TextStyle(fontSize: 10, color: Colors.green[800]),
                            ),
                          ),
                        ],
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(
                            color: item.isAvailable ? Colors.green[100] : Colors.red[100],
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            item.isAvailable ? 'Available' : 'Unavailable',
                            style: TextStyle(
                              fontSize: 12,
                              color: item.isAvailable ? Colors.green[800] : Colors.red[800],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              if (!_selectionMode)
                Column(
                  children: [
                    IconButton(
                      icon: Icon(
                        item.isAvailable ? Icons.visibility_off : Icons.visibility,
                        color: item.isAvailable ? Colors.orange : Colors.green,
                      ),
                      onPressed: () => _toggleAvailability(item.id, item.isAvailable),
                      tooltip: item.isAvailable ? 'Hide' : 'Show',
                    ),
                    IconButton(
                      icon: const Icon(Icons.delete_outline, color: Colors.red),
                      onPressed: () => _restaurantService.updateMenuItem(item.id, {'isAvailable': false}),
                      tooltip: 'Delete',
                    ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(Icons.restaurant, color: Colors.grey),
    );
  }
}
