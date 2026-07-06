import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../widgets/shimmer_loading.dart';

class ProductDetailScreen extends StatefulWidget {
  final String productName;
  final String price;
  final String imageUrl;
  
  const ProductDetailScreen({
    super.key,
    required this.productName,
    required this.price,
    required this.imageUrl,
  });

  @override
  State<ProductDetailScreen> createState() => _ProductDetailScreenState();
}

class _ProductDetailScreenState extends State<ProductDetailScreen> {
  int _quantity = 1;
  bool _isFavorite = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      body: Stack(
        children: [
          // Main Content
          SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Hero Image with Custom Clip
                _buildHeroImage(),
                
                const SizedBox(height: 48),
                
                // Product Identity & Summary
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 16,
                                    vertical: 6,
                                  ),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFC1ECD4),
                                    borderRadius: BorderRadius.circular(50),
                                  ),
                                  child: const Text(
                                    'FRESH FROM FARM',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.w600,
                                      letterSpacing: 1.5,
                                      color: Color(0xFF002114),
                                    ),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Text(
                                  widget.productName,
                                  style: const TextStyle(
                                    fontSize: 36,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFF012D1D),
                                    height: 1.2,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(
                                widget.price,
                                style: TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.orange[800],
                                ),
                              ),
                              Text(
                                '500g',
                                style: TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.w500,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 32),
                      
                      // Nutritional Bento Grid
                      Row(
                        children: [
                          Expanded(
                            child: _buildNutritionCard(
                              'Calories',
                              '120',
                              false,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildNutritionCard(
                              'Protein',
                              '4.4g',
                              true,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildNutritionCard(
                              'Fiber',
                              '2.8g',
                              false,
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: _buildNutritionCard(
                              'Iron',
                              '15%',
                              false,
                            ),
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 48),
                      
                      // Description
                      const Text(
                        'About this product',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF012D1D),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'Fresh produce sourced directly from local Tanzanian farmers. Our products are carefully selected for quality and freshness, ensuring you get the best nature has to offer delivered straight to your door.',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[700],
                          height: 1.6,
                        ),
                      ),
                      
                      const SizedBox(height: 40),
                      
                      // Origin Card
                      Container(
                        padding: const EdgeInsets.all(32),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFEEEA),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Stack(
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Icon(
                                      Icons.public,
                                      size: 18,
                                      color: const Color(0xFF012D1D),
                                    ),
                                    const SizedBox(width: 8),
                                    const Text(
                                      'LOCAL FARM SOURCE',
                                      style: TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        letterSpacing: 1.5,
                                        color: Color(0xFF012D1D),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                const Text(
                                  'Arusha Region, Tanzania',
                                  style: TextStyle(
                                    fontSize: 24,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF012D1D),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                SizedBox(
                                  width: MediaQuery.of(context).size.width * 0.7,
                                  child: Text(
                                    'Sourced directly from smallholder farmers in the Northern Highlands, supporting local communities and sustainable farming practices.',
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.grey[700],
                                      height: 1.5,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            Positioned(
                              bottom: -16,
                              right: -16,
                              child: Icon(
                                Icons.agriculture,
                                size: 120,
                                color: Colors.black.withOpacity(0.03),
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      const SizedBox(height: 24),
                      
                      // Certifications
                      Wrap(
                        spacing: 12,
                        runSpacing: 12,
                        children: [
                          _buildCertificationChip(
                            Icons.verified,
                            'Quality Assured',
                          ),
                          _buildCertificationChip(
                            Icons.spa,
                            'Fresh Daily',
                          ),
                          _buildCertificationChip(
                            Icons.eco,
                            'Locally Sourced',
                          ),
                        ],
                      ),
                      
                      const SizedBox(height: 120),
                    ],
                  ),
                ),
              ],
            ),
          ),
          
          // Top Navigation Buttons
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildFloatingButton(
                      Icons.arrow_back,
                      () => Navigator.pop(context),
                    ),
                    _buildFloatingButton(
                      _isFavorite ? Icons.favorite : Icons.favorite_border,
                      () {
                        setState(() => _isFavorite = !_isFavorite);
                      },
                    ),
                  ],
                ),
              ),
            ),
          ),
          
          // Fixed Action Bar
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(24, 24, 24, 40),
              decoration: BoxDecoration(
                color: const Color(0xFFFBF9F5).withOpacity(0.8),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 20,
                    offset: const Offset(0, -10),
                  ),
                ],
              ),
              child: Row(
                children: [
                  // Quantity Selector
                  Container(
                    height: 56,
                    decoration: BoxDecoration(
                      color: const Color(0xFFE4E2DE),
                      borderRadius: BorderRadius.circular(50),
                    ),
                    padding: const EdgeInsets.all(4),
                    child: Row(
                      children: [
                        _buildQuantityButton(
                          Icons.remove,
                          () {
                            if (_quantity > 1) {
                              setState(() => _quantity--);
                            }
                          },
                        ),
                        SizedBox(
                          width: 32,
                          child: Text(
                            '$_quantity',
                            textAlign: TextAlign.center,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        _buildQuantityButton(
                          Icons.add,
                          () => setState(() => _quantity++),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(width: 24),
                  
                  // Add to Cart Button
                  Expanded(
                    child: Container(
                      height: 56,
                      decoration: BoxDecoration(
                        color: const Color(0xFF012D1D),
                        borderRadius: BorderRadius.circular(50),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFF012D1D).withOpacity(0.2),
                            blurRadius: 20,
                            offset: const Offset(0, 10),
                          ),
                        ],
                      ),
                      child: Material(
                        color: Colors.transparent,
                        child: InkWell(
                          borderRadius: BorderRadius.circular(50),
                          onTap: () {
                            // Add to cart logic
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Added $_quantity item(s) to cart'),
                                behavior: SnackBarBehavior.floating,
                                backgroundColor: Colors.green,
                              ),
                            );
                          },
                          child: const Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                Icons.shopping_bag,
                                color: Colors.white,
                              ),
                              SizedBox(width: 12),
                              Text(
                                'Add to Cart',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
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
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeroImage() {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Stack(
        children: [
          ClipPath(
            clipper: _OrganicClipper(),
            child: Container(
              height: 486,
              width: double.infinity,
              decoration: const BoxDecoration(
                color: Color(0xFFF5F3EF),
              ),
              child: CachedNetworkImage(
                imageUrl: widget.imageUrl,
                fit: BoxFit.cover,
                placeholder: (context, url) => const ShimmerLoading(
                  width: double.infinity,
                  height: double.infinity,
                ),
                errorWidget: (context, url, error) => const Icon(
                  Icons.image_not_supported,
                  size: 80,
                ),
              ),
            ),
          ),
          // Decorative Element
          Positioned(
            bottom: -24,
            right: -8,
            child: Container(
              width: 128,
              height: 128,
              decoration: BoxDecoration(
                color: const Color(0xFFC1ECD4).withOpacity(0.2),
                shape: BoxShape.circle,
              ),
              child: BackdropFilter(
                filter: ImageFilter.blur(sigmaX: 60, sigmaY: 60),
                child: Container(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNutritionCard(String label, String value, bool isHighlighted) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isHighlighted
            ? const Color(0xFF1B4332)
            : const Color(0xFFF5F3EF),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 9,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.2,
              color: isHighlighted
                  ? const Color(0xFF86AF99)
                  : Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: isHighlighted ? Colors.white : const Color(0xFF012D1D),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCertificationChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      decoration: BoxDecoration(
        color: const Color(0xFFEAE8E4),
        borderRadius: BorderRadius.circular(50),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 16,
            color: const Color(0xFF012D1D),
          ),
          const SizedBox(width: 8),
          Text(
            label,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: Color(0xFF012D1D),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFloatingButton(IconData icon, VoidCallback onPressed) {
    return Container(
      width: 48,
      height: 48,
      decoration: BoxDecoration(
        color: const Color(0xFFFBF9F5).withOpacity(0.8),
        shape: BoxShape.circle,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 20,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(50),
          onTap: onPressed,
          child: Icon(
            icon,
            color: const Color(0xFF1B1C1A),
          ),
        ),
      ),
    );
  }

  Widget _buildQuantityButton(IconData icon, VoidCallback onPressed) {
    return Container(
      width: 48,
      height: 48,
      decoration: const BoxDecoration(
        shape: BoxShape.circle,
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(50),
          onTap: onPressed,
          child: Icon(
            icon,
            color: const Color(0xFF012D1D),
          ),
        ),
      ),
    );
  }
}

// Custom Clipper for Organic Shape
class _OrganicClipper extends CustomClipper<Path> {
  @override
  Path getClip(Size size) {
    final path = Path();
    const radius = 64.0;
    
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
