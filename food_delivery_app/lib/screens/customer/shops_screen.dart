import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/shop.dart';
import '../../services/shop_service.dart';
import 'shop_detail_screen.dart';
import '../sme_onboarding_screen.dart';

class ShopsScreen extends StatefulWidget {
  const ShopsScreen({Key? key}) : super(key: key);

  @override
  _ShopsScreenState createState() => _ShopsScreenState();
}

class _ShopsScreenState extends State<ShopsScreen> {
  final ShopService _shopService = ShopService();
  final TextEditingController _searchController = TextEditingController();
  String _searchQuery = '';
  ShopType? _selectedType;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Maduka & Biashara (Shops & Business)'),
        backgroundColor: Colors.orange,
        elevation: 0,
      ),
      body: Column(
        children: [
          // Search bar
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Tafuta duka... (Search shops...)',
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
          ),

          // Register business banner
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: GestureDetector(
              onTap: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const SMEOnboardingScreen(),
                  ),
                );
                
                if (result == true) {
                  setState(() {});
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Biashara yako imesajiliwa! Inaonekana kwenye orodha.'),
                      backgroundColor: Colors.green,
                    ),
                  );
                }
              },
              child: Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Colors.orange[400]!, Colors.orange[600]!],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.orange.withOpacity(0.3),
                      blurRadius: 8,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.add_business,
                        color: Colors.white,
                        size: 30,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Sajili Biashara Yako',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Unganisha biashara yako na wateja wengi zaidi',
                            style: TextStyle(
                              color: Colors.white.withOpacity(0.9),
                              fontSize: 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const Icon(
                      Icons.arrow_forward_ios,
                      color: Colors.white,
                      size: 20,
                    ),
                  ],
                ),
              ),
            ),
          ),

          const SizedBox(height: 16),

          // Category filters
          SizedBox(
            height: 50,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: ShopType.values.length + 1,
              itemBuilder: (context, index) {
                if (index == 0) {
                  return _buildFilterChip(
                    label: 'Zote (All)',
                    isSelected: _selectedType == null,
                    onSelected: () {
                      setState(() {
                        _selectedType = null;
                      });
                    },
                  );
                }
                final type = ShopType.values[index - 1];
                return _buildFilterChip(
                  label: type.displayName.split(' ')[0],
                  isSelected: _selectedType == type,
                  onSelected: () {
                    setState(() {
                      _selectedType = type;
                    });
                  },
                );
              },
            ),
          ),

          const SizedBox(height: 8),

          // Featured shops section
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Maalum (Featured)',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
          ),

          const SizedBox(height: 8),

          // Featured shops horizontal list
          SizedBox(
            height: 180,
            child: StreamBuilder<List<Shop>>(
              stream: _shopService.getFeaturedShops(),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }

                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                final shops = snapshot.data!;
                if (shops.isEmpty) {
                  return const Center(child: Text('Hakuna maduka maalum'));
                }

                return ListView.builder(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: shops.length,
                  itemBuilder: (context, index) {
                    return _buildFeaturedShopCard(shops[index]);
                  },
                );
              },
            ),
          ),

          const SizedBox(height: 16),

          // All shops section
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Maduka Yote (All Shops)',
                style: Theme.of(context).textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
              ),
            ),
          ),

          const SizedBox(height: 8),

          // All shops grid
          Expanded(
            child: StreamBuilder<List<Shop>>(
              stream: _selectedType != null
                  ? _shopService.getShopsByType(_selectedType!)
                  : _shopService.getShops(),
              builder: (context, snapshot) {
                if (snapshot.hasError) {
                  return Center(child: Text('Error: ${snapshot.error}'));
                }

                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                var shops = snapshot.data!;

                // Apply search filter
                if (_searchQuery.isNotEmpty) {
                  shops = shops.where((shop) {
                    return shop.name.toLowerCase().contains(_searchQuery) ||
                        shop.description.toLowerCase().contains(_searchQuery);
                  }).toList();
                }

                if (shops.isEmpty) {
                  return const Center(
                    child: Text('Hakuna maduka yaliyopatikana'),
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
                  itemCount: shops.length,
                  itemBuilder: (context, index) {
                    return _buildShopCard(shops[index]);
                  },
                );
              },
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const SMEOnboardingScreen(),
            ),
          );
          
          if (result == true) {
            // Refresh the shops list if a new shop was added
            setState(() {});
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('Biashara yako imesajiliwa! Inaonekana kwenye orodha.'),
                backgroundColor: Colors.green,
              ),
            );
          }
        },
        backgroundColor: Colors.orange,
        icon: const Icon(Icons.add_business),
        label: const Text(
          'Sajili Biashara',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerFloat,
    );
  }

  Widget _buildFilterChip({
    required String label,
    required bool isSelected,
    required VoidCallback onSelected,
  }) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => onSelected(),
        selectedColor: Colors.orange[100],
        checkmarkColor: Colors.orange,
        labelStyle: TextStyle(
          color: isSelected ? Colors.orange[800] : Colors.grey[700],
        ),
      ),
    );
  }

  Widget _buildFeaturedShopCard(Shop shop) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ShopDetailScreen(shop: shop),
          ),
        );
      },
      child: Container(
        width: 200,
        margin: const EdgeInsets.only(right: 16),
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
            // Shop image placeholder
            Container(
              height: 100,
              decoration: BoxDecoration(
                color: Colors.orange[50],
                borderRadius: const BorderRadius.vertical(
                  top: Radius.circular(16),
                ),
              ),
              child: Center(
                child: Icon(
                  _getShopIcon(shop.type),
                  size: 40,
                  color: Colors.orange,
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    shop.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    shop.category,
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontSize: 12,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.star, size: 14, color: Colors.amber),
                      const SizedBox(width: 4),
                      Text(
                        shop.rating.toStringAsFixed(1),
                        style: const TextStyle(fontSize: 12),
                      ),
                      const Spacer(),
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          color: shop.isOpen ? Colors.green[50] : Colors.red[50],
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          shop.isOpen ? 'Funguliwa' : 'Imefungwa',
                          style: TextStyle(
                            color: shop.isOpen ? Colors.green : Colors.red,
                            fontSize: 10,
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
      ),
    );
  }

  Widget _buildShopCard(Shop shop) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => ShopDetailScreen(shop: shop),
          ),
        );
      },
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
            // Shop image placeholder
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
                    _getShopIcon(shop.type),
                    size: 50,
                    color: Colors.orange,
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
                      shop.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      shop.description,
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
                        const Icon(Icons.star, size: 14, color: Colors.amber),
                        const SizedBox(width: 4),
                        Text(
                          shop.rating.toStringAsFixed(1),
                          style: const TextStyle(fontSize: 12),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 6,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: shop.isOpen ? Colors.green[50] : Colors.red[50],
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            shop.isOpen ? 'Open' : 'Closed',
                            style: TextStyle(
                              color: shop.isOpen ? Colors.green : Colors.red,
                              fontSize: 10,
                            ),
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
