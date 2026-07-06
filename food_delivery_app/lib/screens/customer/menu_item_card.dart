import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../models/restaurant.dart';
import '../../utils/constants.dart';

class MenuItemCard extends StatelessWidget {
  final MenuItem menuItem;
  final bool restaurantIsOpen;

  const MenuItemCard({
    super.key,
    required this.menuItem,
    required this.restaurantIsOpen,
  });

  @override
  Widget build(BuildContext context) {
    final isAvailable = menuItem.isAvailable && restaurantIsOpen;

    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: isAvailable
            ? () => _showItemDetails(context)
            : null,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Item Image
            Expanded(
              flex: 3,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  CachedNetworkImage(
                    imageUrl: menuItem.imageUrl,
                    fit: BoxFit.cover,
                    placeholder: (context, url) => Container(
                      color: Colors.grey[300],
                      child: const Center(
                        child: CircularProgressIndicator(),
                      ),
                    ),
                    errorWidget: (context, url, error) => Container(
                      color: Colors.grey[300],
                      child: const Icon(
                        Icons.fastfood,
                        size: 40,
                        color: Colors.grey,
                      ),
                    ),
                  ),
                  
                  // Unavailable Overlay
                  if (!isAvailable)
                    Container(
                      color: Colors.black54,
                      child: const Center(
                        child: Text(
                          'Unavailable',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
            
            // Item Details
            Expanded(
              flex: 2,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    // Name
                    Text(
                      menuItem.name,
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    
                    // Price and Add Button
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          AppConstants.formatPrice(menuItem.price),
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Theme.of(context).colorScheme.primary,
                          ),
                        ),
                        if (isAvailable)
                          InkWell(
                            onTap: () => _addToCart(context),
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.primary,
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.add,
                                size: 16,
                                color: Colors.white,
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

  void _showItemDetails(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        minChildSize: 0.4,
        maxChildSize: 0.9,
        expand: false,
        builder: (context, scrollController) {
          return SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Image
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: CachedNetworkImage(
                    imageUrl: menuItem.imageUrl,
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                  ),
                ),
                const SizedBox(height: 16),
                
                // Name
                Text(
                  menuItem.name,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 8),
                
                // Category
                Text(
                  menuItem.category,
                  style: TextStyle(
                    fontSize: 14,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 16),
                
                // Description
                Text(
                  menuItem.description,
                  style: const TextStyle(fontSize: 16),
                ),
                const SizedBox(height: 24),
                
                // Price
                Text(
                  AppConstants.formatPrice(menuItem.price),
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                ),
                const SizedBox(height: 24),
                
                // Add to Cart Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      _addToCart(context);
                    },
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    child: const Text('Add to Cart'),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _addToCart(BuildContext context) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('${menuItem.name} added to cart'),
        duration: const Duration(seconds: 2),
        action: SnackBarAction(
          label: 'VIEW CART',
          onPressed: () {
            // Navigate to cart
          },
        ),
      ),
    );
  }
}
