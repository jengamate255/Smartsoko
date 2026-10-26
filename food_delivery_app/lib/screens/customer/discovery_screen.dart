import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:smartsoko/services/supabase_service.dart';
import 'package:smartsoko/widgets/shimmer_loading.dart';
import 'product_listing_screen.dart';

class DiscoveryScreen extends StatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  State<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends State<DiscoveryScreen> {
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';

  static const _categories = [
    (Icons.grain, 'Grains'),
    (Icons.apple, 'Fruits'),
    (Icons.water_drop, 'Dairy'),
    (Icons.set_meal, 'Fish'),
    (Icons.bakery_dining, 'Bakery'),
    (Icons.lunch_dining, 'Food'),
  ];

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      body: CustomScrollView(
        slivers: [
          // Top App Bar
          SliverAppBar(
            floating: true,
            pinned: true,
            backgroundColor: const Color(0xFFE4E2DE).withOpacity(0.8),
            elevation: 0,
            title: Row(
              children: [
                const Icon(Icons.location_on, color: Color(0xFF012D1D)),
                const SizedBox(width: 8),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'DELIVER TO',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 1.5,
                        color: Colors.grey[600],
                      ),
                    ),
                    const Text(
                      'Dar es Salaam, TZ',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF012D1D),
                      ),
                    ),
                  ],
                ),
              ],
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                color: const Color(0xFF012D1D),
                onPressed: () => _showNotifications(context),
              ),
            ],
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Search Bar — live product search
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFE4E2DE),
                      borderRadius: BorderRadius.circular(50),
                    ),
                    child: TextField(
                      controller: _searchController,
                      onChanged: (v) =>
                          setState(() => _searchQuery = v.trim().toLowerCase()),
                      decoration: InputDecoration(
                        hintText: 'Search products, shops...',
                        hintStyle: TextStyle(color: Colors.grey[600]),
                        prefixIcon: const Icon(
                          Icons.search,
                          color: Colors.grey,
                        ),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 20,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 40),

                  if (_searchQuery.isEmpty) ...[
                    // Categories Section
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Browse Categories',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF012D1D),
                          ),
                        ),
                        Text(
                          'See all',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF064E3B),
                          ),
                        ),
                      ],
                    ),

                    const SizedBox(height: 24),

                    // Category Horizontal Scroll
                    SizedBox(
                      height: 110,
                      child: ListView(
                        scrollDirection: Axis.horizontal,
                        children: _categories
                            .map((c) => _buildCategoryItem(c.$1, c.$2))
                            .toList(),
                      ),
                    ),

                    const SizedBox(height: 40),
                  ],

                  // Products — live from Firestore
                  if (_searchQuery.isEmpty)
                    const Text(
                      'Recommended',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF012D1D),
                      ),
                    )
                  else
                    Text(
                      'Results for "$_searchQuery"',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: Color(0xFF012D1D),
                      ),
                    ),
                  const SizedBox(height: 24),

                  _buildProductGrid(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  /// Live product feed from Supabase (search filters by name).
  Widget _buildProductGrid() {
    return FutureBuilder<List<Map<String, dynamic>>>(
      future: _fetchProducts(),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return GridView.count(
            crossAxisCount: 2,
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisSpacing: 24,
            mainAxisSpacing: 24,
            childAspectRatio: 0.7,
            children: List.generate(
              4,
              (_) => const ShimmerLoading(width: double.infinity, height: 200),
            ),
          );
        }
        if (snapshot.hasError) {
          return const Padding(
            padding: EdgeInsets.all(32),
            child: Center(
              child: Text('Could not load products â€” check your connection'),
            ),
          );
        }

        final products = snapshot.data ?? const <Map<String, dynamic>>[];
        if (products.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(32),
            child: Center(
              child: Text(
                _searchQuery.isEmpty
                    ? 'No products available yet'
                    : 'No results for "$_searchQuery"',
              ),
            ),
          );
        }

        return GridView.count(
          crossAxisCount: 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 24,
          mainAxisSpacing: 24,
          childAspectRatio: 0.7,
          children: products.take(20).map((data) {
            return _buildProductCard(
              data['name']?.toString() ?? 'Product',
              data['description']?.toString() ?? '',
              (data['price'] as num?)?.toDouble() ?? 0,
              data['image_url']?.toString() ?? '',
            );
          }).toList(),
        );
      },
    );
  }

  /// Fetches available products from Supabase, newest first.
  Future<List<Map<String, dynamic>>> _fetchProducts() async {
    final client = SupabaseService().client;
    var query = client.from('products').select().eq('is_available', true);
    if (_searchQuery.isNotEmpty) {
      query = query.ilike('name', '%$_searchQuery%');
    }
    return await query.order('created_at', ascending: false).limit(20);
  }

  Widget _buildCategoryItem(IconData icon, String label) {
    return Padding(
      padding: const EdgeInsets.only(right: 24),
      child: GestureDetector(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ProductListingScreen(category: label),
            ),
          );
        },
        child: Column(
          children: [
            Container(
              width: 80,
              height: 80,
              decoration: BoxDecoration(
                color: const Color(0xFFF5F3EF),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Icon(icon, size: 32, color: const Color(0xFF012D1D)),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProductCard(
    String title,
    String subtitle,
    double price,
    String imageUrl,
  ) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProductListingScreen(category: title),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(16)),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFF5F3EF),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: imageUrl.isNotEmpty
                          ? CachedNetworkImage(
                              imageUrl: imageUrl,
                              fit: BoxFit.cover,
                              width: double.infinity,
                              placeholder: (context, url) =>
                                  const ShimmerLoading(
                                    width: double.infinity,
                                    height: double.infinity,
                                  ),
                              errorWidget: (context, url, error) => const Icon(
                                Icons.image_not_supported,
                                size: 50,
                              ),
                            )
                          : const Icon(Icons.image_not_supported, size: 50),
                    ),
                  ),
                  Positioned(
                    bottom: 16,
                    right: 16,
                    child: Container(
                      width: 48,
                      height: 48,
                      decoration: BoxDecoration(
                        color: const Color(0xFF012D1D),
                        borderRadius: BorderRadius.circular(50),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.2),
                            blurRadius: 8,
                            offset: const Offset(0, 4),
                          ),
                        ],
                      ),
                      child: const Icon(Icons.add, color: Colors.white),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1B1C1A),
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'TSh ${price.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF012D1D),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showNotifications(BuildContext context) {
    // Notifications from the shared notifications table (Supabase).
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        minChildSize: 0.4,
        expand: false,
        builder: (ctx, scrollController) =>
            FutureBuilder<List<Map<String, dynamic>>>(
              future: _fetchNotifications(),
              builder: (ctx, snap) {
                if (snap.connectionState == ConnectionState.waiting) {
                  return const Center(child: CircularProgressIndicator());
                }
                final items = snap.data ?? const <Map<String, dynamic>>[];
                if (items.isEmpty) {
                  return const Center(child: Text('No notifications'));
                }
                return ListView.builder(
                  controller: scrollController,
                  itemCount: items.length,
                  itemBuilder: (ctx, i) {
                    final d = items[i];
                    return ListTile(
                      leading: const Icon(Icons.notifications),
                      title: Text(d['title']?.toString() ?? 'Update'),
                      subtitle: Text(d['body']?.toString() ?? ''),
                    );
                  },
                );
              },
            ),
      ),
    );
  }

  /// Newest notifications, newest first. Degrades to an empty list if the
  /// table is unavailable so the sheet never shows a hard error.
  Future<List<Map<String, dynamic>>> _fetchNotifications() async {
    try {
      return await SupabaseService().client
          .from('notifications')
          .select()
          .order('created_at', ascending: false)
          .limit(30);
    } catch (_) {
      return const <Map<String, dynamic>>[];
    }
  }
}
