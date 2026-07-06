import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/restaurant.dart';
import '../../services/restaurant_service.dart';
import '../../widgets/shimmer_loading.dart';
import '../../widgets/error_screen.dart';
import 'restaurant_screen.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final restaurantService = context.read<RestaurantService>();

    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 120.0,
            floating: true,
            pinned: true,
            elevation: 0,
            backgroundColor: const Color(0xFF064E3B),
            flexibleSpace: FlexibleSpaceBar(
              title: const Text(
                'Organic Curator',
                style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
              ),
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFF064E3B), Color(0xFF065F46)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.notifications_none, color: Colors.white),
                onPressed: () {},
              ),
              IconButton(
                icon: const Icon(Icons.search, color: Colors.white),
                onPressed: () {},
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Curated for You',
                    style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF111827)),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Fresh organic food from local gardens',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                  const SizedBox(height: 24),
                  _buildCategories(),
                  const SizedBox(height: 24),
                  const Text(
                    'Popular Restaurants',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF111827)),
                  ),
                  const SizedBox(height: 16),
                ],
              ),
            ),
          ),
          StreamBuilder<List<Restaurant>>(
            stream: restaurantService.getAllRestaurants(),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const SliverFillRemaining(child: Center(child: CircularProgressIndicator()));
              }
              if (snapshot.hasError) {
                return SliverFillRemaining(child: Center(child: Text('Error: ${snapshot.error}')));
              }
              final restaurants = snapshot.data ?? [];
              if (restaurants.isEmpty) {
                return const SliverFillRemaining(child: Center(child: Text('No restaurants found')));
              }

              return SliverPadding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate(
                    (context, index) => _RestaurantCard(restaurant: restaurants[index]),
                    childCount: restaurants.length,
                  ),
                ),
              );
            },
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 100)),
        ],
      ),
    );
  }

  Widget _buildCategories() {
    final categories = ['All', 'Vegetables', 'Fruits', 'Dairy', 'Bakery', 'Honey'];
    return SizedBox(
      height: 44,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: categories.length,
        itemBuilder: (context, index) {
          final isSelected = index == 0;
          return Container(
            margin: const EdgeInsets.only(right: 12),
            child: Chip(
              label: Text(categories[index]),
              backgroundColor: isSelected ? const Color(0xFF064E3B) : Colors.white,
              labelStyle: TextStyle(
                color: isSelected ? Colors.white : const Color(0xFF4B5563),
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: isSelected ? Colors.transparent : const Color(0xFFE5E7EB)),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            ),
          );
        },
      ),
    );
  }
}

class _RestaurantCard extends StatelessWidget {
  final Restaurant restaurant;
  const _RestaurantCard({required this.restaurant});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 16,
            offset: const Offset(0, 8),
          )
        ],
      ),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => RestaurantScreen(restaurant: restaurant)),
          );
        },
        borderRadius: BorderRadius.circular(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              children: [
                ClipRRect(
                  borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                  child: restaurant.imageUrl.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: restaurant.imageUrl,
                          height: 180,
                          width: double.infinity,
                          fit: BoxFit.cover,
                          placeholder: (context, url) => const ShimmerLoading(width: double.infinity, height: 180),
                        )
                      : Container(
                          height: 180,
                          width: double.infinity,
                          color: const Color(0xFFF3F4F6),
                          child: const Icon(Icons.restaurant, size: 48, color: Color(0xFFD1D5DB)),
                        ),
                ),
                Positioned(
                  top: 16,
                  right: 16,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.1), blurRadius: 4)],
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.star, color: Color(0xFFF59E0B), size: 16),
                        const SizedBox(width: 4),
                        Text(
                          restaurant.rating.toStringAsFixed(1),
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ),
                if (!restaurant.isOpen)
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withOpacity(0.5),
                        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                      ),
                      child: const Center(
                        child: Text(
                          'CLOSED',
                          style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 20, letterSpacing: 2),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    restaurant.name,
                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF111827)),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    restaurant.description,
                    style: TextStyle(color: Colors.grey[600], fontSize: 14),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      _buildInfoTag(Icons.access_time_filled, '${restaurant.deliveryTimeMinutes} min', const Color(0xFF064E3B)),
                      const SizedBox(width: 12),
                      _buildInfoTag(Icons.delivery_dining, 'KSh ${restaurant.deliveryFee.toStringAsFixed(0)}', const Color(0xFF059669)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoTag(IconData icon, String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
