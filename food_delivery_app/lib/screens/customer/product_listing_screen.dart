import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../widgets/shimmer_loading.dart';
import 'product_detail_screen.dart';

class ProductListingScreen extends StatefulWidget {
  final String category;
  
  const ProductListingScreen({
    super.key,
    required this.category,
  });

  @override
  State<ProductListingScreen> createState() => _ProductListingScreenState();
}

class _ProductListingScreenState extends State<ProductListingScreen> {
  String _selectedFilter = 'All Fruits';
  
  final List<String> _filters = [
    'All Fruits',
    'Local',
    'Tropical',
    'Berries',
  ];

  final List<Map<String, dynamic>> _products = [
    {
      'name': 'Fresh Avocados',
      'price': 'TSh 5,000',
      'unit': '4 units',
      'description': 'Hass Variety',
      'image': 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400',
      'offset': 0.0,
    },
    {
      'name': 'Sweet Bananas',
      'price': 'TSh 2,000',
      'unit': '1 bunch',
      'description': 'Local Farm',
      'image': 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400',
      'offset': 32.0,
    },
    {
      'name': 'Kenyan Mangoes',
      'price': 'TSh 3,500',
      'unit': '3 units',
      'description': 'Coast Region',
      'image': 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400',
      'offset': -32.0,
    },
    {
      'name': 'Passion Fruits',
      'price': 'TSh 3,000',
      'unit': '500g',
      'description': 'Sweet & Tangy',
      'image': 'https://images.unsplash.com/photo-1595475207225-428b62bda831?w=400',
      'offset': 0.0,
    },
    {
      'name': 'Fresh Strawberries',
      'price': 'TSh 8,000',
      'unit': '250g box',
      'description': 'Highland Farms',
      'image': 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400',
      'offset': -16.0,
    },
    {
      'name': 'Tree Tomatoes',
      'price': 'TSh 2,500',
      'unit': '6 units',
      'description': 'Highland Grown',
      'image': 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400',
      'offset': 16.0,
    },
  ];

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
            backgroundColor: const Color(0xFFFBF9F5).withOpacity(0.8),
            elevation: 0,
            leading: IconButton(
              icon: const Icon(Icons.arrow_back, color: Color(0xFF012D1D)),
              onPressed: () => Navigator.pop(context),
            ),
            title: Row(
              children: [
                const Icon(Icons.location_on, color: Color(0xFF012D1D), size: 20),
                const SizedBox(width: 8),
                const Text(
                  'Organic Curator',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF012D1D),
                  ),
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
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Category Header
                  Text(
                    'THE COLLECTION',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 2,
                      color: Colors.orange[800],
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Fresh\nFruits.',
                    style: TextStyle(
                      fontSize: 48,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF012D1D),
                      height: 1.1,
                    ),
                  ),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: 280,
                    child: Text(
                      'Farm-fresh produce from local Tanzanian and East African farmers, delivered to your doorstep.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                        height: 1.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 32),
                ],
              ),
            ),
          ),

          // Filter & Sort Section (Sticky)
          SliverPersistentHeader(
            pinned: true,
            delegate: _FilterHeaderDelegate(
              selectedFilter: _selectedFilter,
              filters: _filters,
              onFilterSelected: (filter) {
                setState(() => _selectedFilter = filter);
              },
            ),
          ),

          // Product Grid
          SliverPadding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 120),
            sliver: SliverGrid(
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 24,
                mainAxisSpacing: 48,
                childAspectRatio: 0.65,
              ),
              delegate: SliverChildBuilderDelegate(
                (context, index) {
                  final product = _products[index];
                  return Transform.translate(
                    offset: Offset(0, product['offset']),
                    child: _buildProductCard(product),
                  );
                },
                childCount: _products.length,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> product) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ProductDetailScreen(
              productName: product['name'],
              price: product['price'],
              imageUrl: product['image'],
            ),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(16),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Stack(
                children: [
                  // Custom Mask Shape
                  ClipPath(
                    clipper: _CustomMaskClipper(),
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF5F3EF),
                      ),
                      child: CachedNetworkImage(
                        imageUrl: product['image'],
                        fit: BoxFit.cover,
                        width: double.infinity,
                        height: double.infinity,
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
                  // Add to Cart Button
                  Positioned(
                    bottom: 16,
                    right: 16,
                    child: GestureDetector(
                      onTap: () {
                        // Add to cart without navigating
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('${product['name']} added to cart'),
                            behavior: SnackBarBehavior.floating,
                            backgroundColor: Colors.green,
                            duration: const Duration(seconds: 1),
                          ),
                        );
                      },
                      child: Container(
                        width: 48,
                        height: 48,
                        decoration: BoxDecoration(
                          color: Colors.orange[700],
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
                          Icons.add_shopping_cart,
                          color: Colors.white,
                          size: 20,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Text(
                          product['name'],
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF012D1D),
                            height: 1.2,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        product['price'],
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.orange[800],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 4,
                        ),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF5F3EF),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          product['unit'],
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w500,
                            color: Colors.grey[700],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '• ${product['description']}',
                        style: TextStyle(
                          fontSize: 11,
                          color: Colors.grey[600],
                        ),
                      ),
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
}

// Custom Clipper for the mask effect
class _CustomMaskClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    const radius = 48.0;
    
    path.moveTo(radius, 0);
    path.lineTo(size.width - radius, 0);
    path.quadraticBezierTo(size.width, 0, size.width, radius);
    path.lineTo(size.width, size.height - radius);
    path.quadraticBezierTo(
      size.width,
      size.height,
      size.width - radius,
      size.height,
    );
    path.lineTo(radius, size.height);
    path.quadraticBezierTo(0, size.height, 0, size.height - radius);
    path.lineTo(0, radius);
    path.quadraticBezierTo(0, 0, radius, 0);
    
    return path;
  }

  @override
  bool shouldReclip(CustomClipper<Path> oldClipper) => false;
}

// Sticky Filter Header Delegate
class _FilterHeaderDelegate extends SliverPersistentHeaderDelegate {
  final String selectedFilter;
  final List<String> filters;
  final Function(String) onFilterSelected;

  _FilterHeaderDelegate({
    required this.selectedFilter,
    required this.filters,
    required this.onFilterSelected,
  });

  @override
  Widget build(
    BuildContext context,
    double shrinkOffset,
    bool overlapsContent,
  ) {
    return Container(
      color: const Color(0xFFFBF9F5).withOpacity(0.95),
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: filters.map((filter) {
                  final isSelected = filter == selectedFilter;
                  return Padding(
                    padding: const EdgeInsets.only(right: 12),
                    child: FilterChip(
                      label: Text(filter),
                      selected: isSelected,
                      onSelected: (selected) {
                        if (selected) onFilterSelected(filter);
                      },
                      backgroundColor: const Color(0xFFEAE8E4),
                      selectedColor: const Color(0xFFC1ECD4),
                      labelStyle: TextStyle(
                        fontWeight: FontWeight.w500,
                        color: isSelected
                            ? const Color(0xFF002114)
                            : const Color(0xFF1B1C1A),
                      ),
                      padding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 10,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(50),
                        side: BorderSide.none,
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(50),
              border: Border.all(
                color: const Color(0xFFC1C8C2).withOpacity(0.2),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.05),
                  blurRadius: 4,
                  offset: const Offset(0, 2),
                ),
              ],
            ),
            child: Material(
              color: Colors.transparent,
              child: InkWell(
                borderRadius: BorderRadius.circular(50),
                onTap: () {
                  // Show sort options
                },
                child: Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(
                        Icons.sort,
                        size: 18,
                        color: Colors.grey[700],
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'Sort',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[700],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  double get maxExtent => 64;

  @override
  double get minExtent => 64;

  @override
  bool shouldRebuild(covariant SliverPersistentHeaderDelegate oldDelegate) =>
      true;
}
