import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/shop.dart';
import '../../services/shop_service.dart';
import '../../services/auth_service.dart';

class ShopDetailScreen extends StatefulWidget {
  final Shop shop;

  const ShopDetailScreen({Key? key, required this.shop}) : super(key: key);

  @override
  _ShopDetailScreenState createState() => _ShopDetailScreenState();
}

class _ShopDetailScreenState extends State<ShopDetailScreen> {
  final ShopService _shopService = ShopService();
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  String _selectedCategory = 'All';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.shop.name),
        backgroundColor: Colors.orange,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: () {
              // Share shop functionality
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Share functionality coming soon!')),
              );
            },
          ),
        ],
      ),
      body: Column(
        children: [
          // Shop header
          _buildShopHeader(),

          // Search and filter
          _buildSearchAndFilter(),

          // Products grid
          Expanded(
            child: _buildProductsGrid(),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _contactShop(context),
        backgroundColor: Colors.green,
        icon: const Icon(Icons.chat),
        label: const Text('Wasiliana'),
      ),
    );
  }

  Widget _buildShopHeader() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Shop icon
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(
                  _getShopIcon(widget.shop.type),
                  size: 40,
                  color: Colors.orange,
                ),
              ),
              const SizedBox(width: 16),

              // Shop info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            widget.shop.name,
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        if (widget.shop.isVerified)
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: Colors.blue[50],
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.verified, size: 14, color: Colors.blue[700]),
                                const SizedBox(width: 4),
                                Text(
                                  'Verified',
                                  style: TextStyle(
                                    color: Colors.blue[700],
                                    fontSize: 12,
                                  ),
                                ),
                              ],
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      widget.shop.category,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        const Icon(Icons.star, size: 16, color: Colors.amber),
                        const SizedBox(width: 4),
                        Text(
                          widget.shop.rating.toStringAsFixed(1),
                          style: const TextStyle(fontSize: 14),
                        ),
                        const SizedBox(width: 16),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: widget.shop.isOpen ? Colors.green[50] : Colors.red[50],
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            widget.shop.isOpen ? 'Funguliwa (Open)' : 'Imefungwa (Closed)',
                            style: TextStyle(
                              color: widget.shop.isOpen ? Colors.green : Colors.red,
                              fontSize: 12,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 16),

          // Shop details
          Text(
            widget.shop.description,
            style: TextStyle(
              color: Colors.grey[700],
              fontSize: 14,
            ),
          ),

          const SizedBox(height: 12),

          // Contact info
          Row(
            children: [
              Icon(Icons.location_on, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  widget.shop.address,
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 8),

          Row(
            children: [
              Icon(Icons.phone, size: 16, color: Colors.grey[600]),
              const SizedBox(width: 8),
              Text(
                widget.shop.ownerPhone,
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 14,
                ),
              ),
            ],
          ),

          if (widget.shop.whatsappNumber != null) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.message, size: 16, color: Colors.green[600]),
                const SizedBox(width: 8),
                Text(
                  'WhatsApp: ${widget.shop.whatsappNumber}',
                  style: TextStyle(
                    color: Colors.green[600],
                    fontSize: 14,
                  ),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSearchAndFilter() {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Search bar
          TextField(
            controller: _searchController,
            decoration: InputDecoration(
              hintText: 'Tafuta bidhaa... (Search products...)',
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              filled: true,
              fillColor: Colors.grey[100],
            ),
            onChanged: (value) {
              setState(() {
                _searchQuery = value.toLowerCase();
              });
            },
          ),

          const SizedBox(height: 12),

          // Category filter
          StreamBuilder<List<Product>>(
            stream: _shopService.getShopProducts(widget.shop.id),
            builder: (context, snapshot) {
              if (!snapshot.hasData || snapshot.data!.isEmpty) {
                return const SizedBox.shrink();
              }

              final products = snapshot.data!;
              final categories = ['All'] +
                  products.map((p) => p.category).toSet().toList();

              return SizedBox(
                height: 40,
                child: ListView.builder(
                  scrollDirection: Axis.horizontal,
                  itemCount: categories.length,
                  itemBuilder: (context, index) {
                    final category = categories[index];
                    final isSelected = _selectedCategory == category;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: FilterChip(
                        label: Text(category),
                        selected: isSelected,
                        onSelected: (_) {
                          setState(() {
                            _selectedCategory = category;
                          });
                        },
                        selectedColor: Colors.orange[100],
                        checkmarkColor: Colors.orange,
                      ),
                    );
                  },
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _buildProductsGrid() {
    return StreamBuilder<List<Product>>(
      stream: _shopService.getShopProducts(widget.shop.id),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }

        if (!snapshot.hasData) {
          return const Center(child: CircularProgressIndicator());
        }

        var products = snapshot.data!;

        // Apply search filter
        if (_searchQuery.isNotEmpty) {
          products = products.where((product) {
            return product.name.toLowerCase().contains(_searchQuery) ||
                product.description.toLowerCase().contains(_searchQuery);
          }).toList();
        }

        // Apply category filter
        if (_selectedCategory != 'All') {
          products = products
              .where((product) => product.category == _selectedCategory)
              .toList();
        }

        if (products.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  Icons.inventory_2_outlined,
                  size: 64,
                  color: Colors.grey[400],
                ),
                const SizedBox(height: 16),
                Text(
                  'Hakuna bidhaa zilizopatikana',
                  style: TextStyle(
                    color: Colors.grey[600],
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          );
        }

        return GridView.builder(
          padding: const EdgeInsets.all(16),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            childAspectRatio: 0.75,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
          ),
          itemCount: products.length,
          itemBuilder: (context, index) {
            return _buildProductCard(products[index]);
          },
        );
      },
    );
  }

  Widget _buildProductCard(Product product) {
    return GestureDetector(
      onTap: () => _showProductDetails(product),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.grey.withOpacity(0.2),
              blurRadius: 8,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product image placeholder
            Expanded(
              flex: 2,
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(16),
                  ),
                ),
                child: Center(
                  child: Icon(
                    Icons.shopping_bag,
                    size: 40,
                    color: Colors.orange[300],
                  ),
                ),
              ),
            ),

            Expanded(
              flex: 3,
              child: Padding(
                padding: const EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      product.description,
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 12,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const Spacer(),
                    Row(
                      children: [
                        Text(
                          'TSh ${product.price.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.orange,
                            fontSize: 14,
                          ),
                        ),
                        if (product.unit != null) ...[
                          const SizedBox(width: 4),
                          Text(
                            '/ ${product.unit}',
                            style: TextStyle(
                              color: Colors.grey[600],
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Icon(
                          product.isAvailable && product.stockQuantity > 0
                              ? Icons.check_circle
                              : Icons.cancel,
                          size: 14,
                          color: product.isAvailable && product.stockQuantity > 0
                              ? Colors.green
                              : Colors.red,
                        ),
                        const SizedBox(width: 4),
                        Text(
                          product.isAvailable && product.stockQuantity > 0
                              ? 'Inapatikana (${product.stockQuantity})'
                              : 'Haipatikani',
                          style: TextStyle(
                            color: product.isAvailable && product.stockQuantity > 0
                                ? Colors.green
                                : Colors.red,
                            fontSize: 10,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showProductDetails(Product product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),

              // Product image placeholder
              Container(
                height: 200,
                decoration: BoxDecoration(
                  color: Colors.orange[50],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Center(
                  child: Icon(
                    Icons.shopping_bag,
                    size: 80,
                    color: Colors.orange[300],
                  ),
                ),
              ),

              const SizedBox(height: 20),

              Text(
                product.name,
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                ),
              ),

              const SizedBox(height: 8),

              Text(
                product.description,
                style: TextStyle(
                  color: Colors.grey[600],
                  fontSize: 16,
                ),
              ),

              const SizedBox(height: 16),

              Row(
                children: [
                  Text(
                    'TSh ${product.price.toStringAsFixed(0)}',
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                      color: Colors.orange,
                    ),
                  ),
                  if (product.unit != null) ...[
                    const SizedBox(width: 8),
                    Text(
                      'per ${product.unit}',
                      style: TextStyle(
                        color: Colors.grey[600],
                        fontSize: 16,
                      ),
                    ),
                  ],
                ],
              ),

              const SizedBox(height: 8),

              Row(
                children: [
                  Icon(
                    product.isAvailable && product.stockQuantity > 0
                        ? Icons.check_circle
                        : Icons.cancel,
                    color: product.isAvailable && product.stockQuantity > 0
                        ? Colors.green
                        : Colors.red,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    product.isAvailable && product.stockQuantity > 0
                        ? 'Inapatikana (${product.stockQuantity} zimebaki)'
                        : 'Haipatikani',
                    style: TextStyle(
                      color: product.isAvailable && product.stockQuantity > 0
                          ? Colors.green
                          : Colors.red,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 24),

              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton.icon(
                  onPressed: product.isAvailable && product.stockQuantity > 0
                      ? () => _contactForProduct(product)
                      : null,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  icon: const Icon(Icons.chat),
                  label: const Text(
                    'Wasiliana kwa bidhaa hii',
                    style: TextStyle(fontSize: 16),
                  ),
                ),
              ),

              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  void _contactShop(BuildContext context) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return Container(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey[300],
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Text(
                'Wasiliana na ${widget.shop.name}',
                style: const TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: const Icon(Icons.phone, color: Colors.blue),
                title: const Text('Piga Simu'),
                subtitle: Text(widget.shop.ownerPhone),
                onTap: () {
                  Navigator.pop(context);
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Calling ${widget.shop.ownerPhone}...')),
                  );
                },
              ),
              if (widget.shop.whatsappNumber != null)
                ListTile(
                  leading: const Icon(Icons.message, color: Colors.green),
                  title: const Text('WhatsApp'),
                  subtitle: Text(widget.shop.whatsappNumber!),
                  onTap: () {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Opening WhatsApp...')),
                    );
                  },
                ),
              const SizedBox(height: 20),
            ],
          ),
        );
      },
    );
  }

  void _contactForProduct(Product product) {
    Navigator.pop(context); // Close product details
    _contactShop(context);
  }

  IconData _getShopIcon(ShopType type) {
    switch (type) {
      case ShopType.grocery:
        return Icons.local_grocery_store;
      case ShopType.electronics:
        return Icons.electrical_services;
      case ShopType.clothing:
        return Icons.checkroom;
      case ShopType.pharmacy:
        return Icons.local_pharmacy;
      case ShopType.hardware:
        return Icons.hardware;
      case ShopType.beauty:
        return Icons.face;
      case ShopType.restaurant:
        return Icons.restaurant;
      case ShopType.fish:
        return Icons.set_meal;
      case ShopType.farming:
        return Icons.agriculture;
      case ShopType.dairy:
        return Icons.local_drink;
      case ShopType.other:
        return Icons.store;
    }
  }
}
