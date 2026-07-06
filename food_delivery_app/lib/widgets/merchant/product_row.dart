import 'package:flutter/material.dart';
import '../../models/shop.dart';

class ProductRow extends StatelessWidget {
  final Product product;
  final VoidCallback? onTap;
  final VoidCallback? onToggleAvailability;
  final VoidCallback? onDelete;

  const ProductRow({
    super.key,
    required this.product,
    this.onTap,
    this.onToggleAvailability,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: product.imageUrl != null && product.imageUrl!.isNotEmpty
                    ? Image.network(
                        product.imageUrl!,
                        width: 60,
                        height: 60,
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) {
                          return _buildPlaceholder();
                        },
                      )
                    : _buildPlaceholder(),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      product.description,
                      style: TextStyle(
                        fontSize: 14,
                        color: Colors.grey[600],
                      ),
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'TSh ${product.price.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.green,
                          ),
                        ),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: product.isAvailable
                                    ? Colors.green[100]
                                    : Colors.red[100],
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                product.isAvailable ? 'Available' : 'Unavailable',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: product.isAvailable
                                      ? Colors.green[800]
                                      : Colors.red[800],
                                ),
                              ),
                            ),
                            if (product.unit != null) ...[
                              const SizedBox(width: 8),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.blue[50],
                                  borderRadius: BorderRadius.circular(12),
                                ),
                                child: Text(
                                  product.unit!,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.blue[800],
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                    if (product.stockQuantity > 0) ...[
                      const SizedBox(height: 4),
                      Text(
                        'Stock: ${product.stockQuantity}',
                        style: TextStyle(
                          fontSize: 12,
                          color: product.stockQuantity < 10 ? Colors.orange : Colors.grey[600],
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Column(
                children: [
                  IconButton(
                    icon: Icon(
                      product.isAvailable
                          ? Icons.visibility_off
                          : Icons.visibility,
                      color: product.isAvailable
                          ? Colors.orange
                          : Colors.green,
                    ),
                    onPressed: onToggleAvailability,
                    tooltip: product.isAvailable
                        ? 'Mark as unavailable'
                        : 'Mark as available',
                  ),
                  IconButton(
                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                    onPressed: onDelete,
                    tooltip: 'Delete',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPlaceholder() {
    return Container(
      width: 60,
      height: 60,
      decoration: BoxDecoration(
        color: Colors.grey[200],
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(
        Icons.inventory_2,
        color: Colors.grey,
      ),
    );
  }
}
