import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/restaurant.dart';
import '../../services/restaurant_service.dart';
import '../../services/order_service.dart';
import '../../utils/constants.dart';
import 'cart_screen.dart';

class RestaurantScreen extends StatefulWidget {
  final Restaurant restaurant;

  const RestaurantScreen({super.key, required this.restaurant});

  @override
  State<RestaurantScreen> createState() => _RestaurantScreenState();
}

class _RestaurantScreenState extends State<RestaurantScreen> {
  final Map<String, int> _cartItems = {};
  String? _selectedCategory;

  @override
  Widget build(BuildContext context) {
    final restaurantService = context.read<RestaurantService>();

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(widget.restaurant.name),
              background: widget.restaurant.imageUrl.isNotEmpty
                  ? Image.network(widget.restaurant.imageUrl, fit: BoxFit.cover)
                  : Container(color: Colors.grey[300]),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.restaurant.description,
                    style: Theme.of(context).textTheme.bodyLarge,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Icon(Icons.access_time, size: 20, color: Colors.grey[600]),
                      const SizedBox(width: 8),
                      Text('${widget.restaurant.deliveryTimeMinutes} min'),
                      const SizedBox(width: 24),
                      Icon(Icons.delivery_dining, size: 20, color: Colors.grey[600]),
                      const SizedBox(width: 8),
                      Text(AppConstants.formatPrice(widget.restaurant.deliveryFee)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          StreamBuilder<List<MenuItem>>(
            stream: restaurantService.getMenuItems(widget.restaurant.id),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const SliverFillRemaining(
                  child: Center(child: CircularProgressIndicator()),
                );
              }

              final menuItems = snapshot.data ?? [];
              if (menuItems.isEmpty) {
                return const SliverFillRemaining(
                  child: Center(child: Text('No menu items available')),
                );
              }

              final categories = menuItems.map((e) => e.category).toSet().toList();

              return SliverList(
                delegate: SliverChildBuilderDelegate(
                  (context, index) {
                    if (index == 0) {
                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: Wrap(
                          spacing: 8,
                          children: [
                            FilterChip(
                              label: const Text('All'),
                              selected: _selectedCategory == null,
                              onSelected: (_) => setState(() => _selectedCategory = null),
                            ),
                            ...categories.map((cat) => FilterChip(
                              label: Text(cat),
                              selected: _selectedCategory == cat,
                              onSelected: (_) => setState(() => _selectedCategory = cat),
                            )),
                          ],
                        ),
                      );
                    }

                    final itemIndex = index - 1;
                    final filteredItems = _selectedCategory == null
                        ? menuItems
                        : menuItems.where((e) => e.category == _selectedCategory).toList();

                    if (itemIndex >= filteredItems.length) return null;

                    final item = filteredItems[itemIndex];
                    final quantity = _cartItems[item.id] ?? 0;

                    return ListTile(
                      leading: Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: item.imageUrl.isNotEmpty
                            ? ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(item.imageUrl, fit: BoxFit.cover),
                              )
                            : const Icon(Icons.fastfood),
                      ),
                      title: Text(item.name),
                      subtitle: Text('TZS ${item.price.toStringAsFixed(0)}'),
                      trailing: quantity > 0
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                IconButton(
                                  icon: const Icon(Icons.remove_circle_outline),
                                  onPressed: () {
                                    setState(() {
                                      if (_cartItems[item.id]! > 1) {
                                        _cartItems[item.id] = _cartItems[item.id]! - 1;
                                      } else {
                                        _cartItems.remove(item.id);
                                      }
                                    });
                                  },
                                ),
                                Text('$quantity'),
                                IconButton(
                                  icon: const Icon(Icons.add_circle_outline),
                                  onPressed: () {
                                    setState(() {
                                      _cartItems[item.id] = (_cartItems[item.id] ?? 0) + 1;
                                    });
                                  },
                                ),
                              ],
                            )
                          : ElevatedButton(
                              onPressed: () {
                                setState(() {
                                  _cartItems[item.id] = 1;
                                });
                              },
                              child: const Text('Add'),
                            ),
                    );
                  },
                  childCount: 1 + (_selectedCategory == null
                      ? menuItems.length
                      : menuItems.where((e) => e.category == _selectedCategory).length),
                ),
              );
            },
          ),
          const SliverPadding(padding: EdgeInsets.only(bottom: 80)),
        ],
      ),
      bottomSheet: _cartItems.isNotEmpty
          ? Container(
              color: Colors.white,
              padding: const EdgeInsets.all(16),
              child: SafeArea(
                child: SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => CartScreen(
                            restaurant: widget.restaurant,
                            cartItems: Map.from(_cartItems),
                          ),
                        ),
                      );
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange,
                      foregroundColor: Colors.white,
                    ),
                    child: Text('View Cart (${_cartItems.values.fold(0, (a, b) => a + b)} items)'),
                  ),
                ),
              ),
            )
          : null,
    );
  }
}
