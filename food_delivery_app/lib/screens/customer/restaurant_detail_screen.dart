import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:provider/provider.dart';
import '../../models/restaurant.dart';
import '../../models/restaurant.dart' as models;
import '../../services/restaurant_service.dart';
import '../../services/analytics_service.dart';
import '../../widgets/shimmer_loading.dart';
import 'menu_item_card.dart';

class RestaurantDetailScreen extends StatefulWidget {
  final Restaurant restaurant;

  const RestaurantDetailScreen({
    super.key,
    required this.restaurant,
  });

  @override
  State<RestaurantDetailScreen> createState() => _RestaurantDetailScreenState();
}

class _RestaurantDetailScreenState extends State<RestaurantDetailScreen> {
  @override
  void initState() {
    super.initState();
    final analytics = context.read<AnalyticsService>();
    analytics.logScreenView(
      screenName: 'RestaurantDetail',
      screenClass: 'RestaurantDetailScreen',
    );
  }

  @override
  Widget build(BuildContext context) {
    final restaurantService = context.read<RestaurantService>();

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // App Bar with Restaurant Image
          SliverAppBar(
            expandedHeight: 200,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: Text(
                widget.restaurant.name,
                style: const TextStyle(
                  shadows: [
                    Shadow(
                      offset: Offset(0, 1),
                      blurRadius: 3.0,
                      color: Colors.black45,
                    ),
                  ],
                ),
              ),
              background: CachedNetworkImage(
                imageUrl: widget.restaurant.imageUrl,
                fit: BoxFit.cover,
                placeholder: (context, url) => Container(
                  color: Colors.grey[300],
                ),
                errorWidget: (context, url, error) => Container(
                  color: Colors.grey[300],
                  child: const Icon(Icons.restaurant, size: 60),
                ),
              ),
            ),
          ),
          
          // Restaurant Info
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.restaurant.description,
                    style: const TextStyle(fontSize: 16),
                  ),
                  const SizedBox(height: 16),
                  
                  // Rating, Time, Fee
                  Row(
                    children: [
                      Icon(Icons.star, color: Colors.amber[700], size: 20),
                      const SizedBox(width: 4),
                      Text(
                        restaurant.rating.toStringAsFixed(1),
                        style: const TextStyle(fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(width: 16),
                      const Icon(Icons.access_time, color: Colors.grey, size: 20),
                      const SizedBox(width: 4),
                      Text('${widget.restaurant.deliveryTimeMinutes} min'),
                      const SizedBox(width: 16),
                      const Icon(Icons.delivery_dining, color: Colors.grey, size: 20),
                      const SizedBox(width: 4),
                      Text('TSh ${widget.restaurant.deliveryFee.toStringAsFixed(0)}'),
                    ],
                  ),
                  
                  // Closed Status
                  if (!widget.restaurant.isOpen) ...[
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.red[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.schedule, color: Colors.red[900], size: 16),
                          const SizedBox(width: 8),
                          Text(
                            'Currently Closed',
                            style: TextStyle(
                              color: Colors.red[900],
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  
                  const SizedBox(height: 24),
                  const Text(
                    'Menu',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
          
          // Menu Items
          StreamBuilder<List<models.MenuItem>>(
            stream: restaurantService.getMenuItems(widget.restaurant.id),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return SliverPadding(
                  padding: const EdgeInsets.all(16),
                  sliver: SliverGrid(
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      childAspectRatio: 0.75,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                    ),
                    delegate: SliverChildBuilderDelegate(
                      (context, index) => const ShimmerLoading(
                        child: Card(child: SizedBox()),
                      ),
                      childCount: 6,
                    ),
                  ),
                );
              }

              if (snapshot.hasError) {
                return SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(32),
                    child: Center(
                      child: Column(
                        children: [
                          const Icon(Icons.error_outline, size: 48, color: Colors.red),
                          const SizedBox(height: 16),
                          Text('Error loading menu: ${snapshot.error}'),
                        ],
                      ),
                    ),
                  ),
                );
              }

              final menuItems = snapshot.data ?? [];

              if (menuItems.isEmpty) {
                return const SliverToBoxAdapter(
                  child: Padding(
                    padding: EdgeInsets.all(32),
                    child: Center(
                      child: Column(
                        children: [
                          Icon(Icons.restaurant_menu, size: 48, color: Colors.grey),
                          SizedBox(height: 16),
                          Text(
                            'No menu items available',
                            style: TextStyle(color: Colors.grey),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              }

              return SliverPadding(
                padding: const EdgeInsets.all(16),
                sliver: SliverGrid(
                  gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                    crossAxisCount: 2,
                    childAspectRatio: 0.75,
                    crossAxisSpacing: 12,
                    mainAxisSpacing: 12,
                  ),
                  delegate: SliverChildBuilderDelegate(
                    (context, index) {
                      return MenuItemCard(
                        menuItem: menuItems[index],
                        restaurantIsOpen: widget.restaurant.isOpen,
                      );
                    },
                    childCount: menuItems.length,
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }
}
