import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../widgets/shimmer_loading.dart';
import 'product_listing_screen.dart';

class DiscoveryScreen extends StatefulWidget {
  const DiscoveryScreen({super.key});

  @override
  State<DiscoveryScreen> createState() => _DiscoveryScreenState();
}

class _DiscoveryScreenState extends State<DiscoveryScreen> {
  final TextEditingController _searchController = TextEditingController();

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
                onPressed: () {},
              ),
            ],
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Search Bar
                  Container(
                    decoration: BoxDecoration(
                      color: const Color(0xFFE4E2DE),
                      borderRadius: BorderRadius.circular(50),
                    ),
                    child: TextField(
                      controller: _searchController,
                      decoration: InputDecoration(
                        hintText: 'Search fresh produce...',
                        hintStyle: TextStyle(color: Colors.grey[600]),
                        prefixIcon: const Icon(Icons.search, color: Colors.grey),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 20,
                        ),
                      ),
                    ),
                  ),

                  const SizedBox(height: 40),

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
                      children: [
                        _buildCategoryItem(Icons.grain, 'Grains'),
                        _buildCategoryItem(Icons.apple, 'Fruits'),
                        _buildCategoryItem(Icons.water_drop, 'Dairy'),
                        _buildCategoryItem(Icons.set_meal, 'Fish'),
                        _buildCategoryItem(Icons.bakery_dining, 'Bakery'),
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),

                  // Hero Banner
                  Container(
                    height: 220,
                    decoration: BoxDecoration(
                      color: const Color(0xFF1B4332),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Stack(
                      children: [
                        Positioned(
                          left: 32,
                          top: 32,
                          bottom: 32,
                          child: SizedBox(
                            width: MediaQuery.of(context).size.width * 0.5,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF064E3B),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text(
                                    'LIMITED OFFER',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      letterSpacing: 1.5,
                                      color: Colors.white,
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 16),
                                const Text(
                                  'Fresh Harvest Today',
                                  style: TextStyle(
                                    fontSize: 28,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                    height: 1.2,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton(
                                  onPressed: () {},
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFFA5D0B9),
                                    foregroundColor: const Color(0xFF002114),
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 32,
                                      vertical: 16,
                                    ),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(50),
                                    ),
                                  ),
                                  child: const Text(
                                    'Claim 20% Off',
                                    style: TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Positioned(
                          right: -40,
                          bottom: -40,
                          child: Transform.rotate(
                            angle: 0.2,
                            child: Container(
                              width: 200,
                              height: 200,
                              decoration: BoxDecoration(
                                borderRadius: BorderRadius.circular(16),
                                image: const DecorationImage(
                                  image: NetworkImage(
                                    'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=400',
                                  ),
                                  fit: BoxFit.cover,
                                ),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 40),

                  // Recommended Section
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Recommended',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF012D1D),
                            ),
                          ),
                          Text(
                            'Curated daily for your lifestyle',
                            style: TextStyle(
                              fontSize: 14,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                      IconButton(
                        icon: const Icon(Icons.tune),
                        color: Colors.grey[600],
                        onPressed: () {},
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // Product Grid
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 24,
                    mainAxisSpacing: 24,
                    childAspectRatio: 0.7,
                    children: [
                      _buildProductCard(
                        'Fresh Avocados',
                        'Hass Variety • 4 units',
                        'TSh 5,000',
                        'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400',
                      ),
                      _buildProductCard(
                        'Sweet Bananas',
                        'Local Farm • 1 bunch',
                        'TSh 2,000',
                        'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400',
                      ),
                      _buildProductCard(
                        'Kenyan Mangoes',
                        'Coast Region • 3 units',
                        'TSh 3,500',
                        'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400',
                      ),
                      _buildProductCard(
                        'Passion Fruits',
                        'Sweet & Tangy • 500g',
                        'TSh 3,000',
                        'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=400',
                      ),
                    ],
                  ),

                  const SizedBox(height: 100),
                ],
              ),
            ),
          ),
        ],
      ),
    );
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
              child: Icon(
                icon,
                size: 32,
                color: const Color(0xFF012D1D),
              ),
            ),
            const SizedBox(height: 12),
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
    String price,
    String imageUrl,
  ) {
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
      ),
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
                    child: CachedNetworkImage(
                      imageUrl: imageUrl,
                      fit: BoxFit.cover,
                      width: double.infinity,
                      placeholder: (context, url) => const ShimmerLoading(
                        width: double.infinity,
                        height: double.infinity,
                      ),
                      errorWidget: (context, url, error) => const Icon(
                        Icons.image_not_supported,
                        size: 50,
                      ),
                    ),
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
                    child: const Icon(
                      Icons.add,
                      color: Colors.white,
                    ),
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
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                const SizedBox(height: 8),
                Text(
                  price,
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.w800,
                    color: Colors.orange[800],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
