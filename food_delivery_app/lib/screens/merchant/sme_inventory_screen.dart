import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/shop.dart';
import '../../models/sme_models.dart';
import '../../services/sme_service.dart';

class SMEInventoryScreen extends StatefulWidget {
  final Shop shop;

  const SMEInventoryScreen({super.key, required this.shop});

  @override
  State<SMEInventoryScreen> createState() => _SMEInventoryScreenState();
}

class _SMEInventoryScreenState extends State<SMEInventoryScreen> {
  final SMEService _smeService = SMEService();
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  String _searchQuery = '';
  String _filter = 'all';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: _showStockAlerts,
          ),
        ],
      ),
      body: Column(
        children: [
          // Low stock alert banner
          StreamBuilder<List<Product>>(
            stream: _firestore
                .collection('products')
                .where('shopId', isEqualTo: widget.shop.id)
                .snapshots()
                .map((snapshot) => snapshot.docs
                    .map((doc) => Product.fromFirestore(doc))
                    .toList()),
            builder: (context, snapshot) {
              if (!snapshot.hasData) return const SizedBox.shrink();
              
              final lowStockProducts = snapshot.data!
                  .where((p) => p.stockQuantity > 0 && p.stockQuantity < 10)
                  .toList();
              final outOfStockProducts = snapshot.data!
                  .where((p) => p.stockQuantity == 0)
                  .toList();

              if (lowStockProducts.isEmpty && outOfStockProducts.isEmpty) {
                return const SizedBox.shrink();
              }

              return Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                margin: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: outOfStockProducts.isNotEmpty
                      ? Colors.red.withOpacity(0.1)
                      : Colors.orange.withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: outOfStockProducts.isNotEmpty
                        ? Colors.red.withOpacity(0.3)
                        : Colors.orange.withOpacity(0.3),
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      outOfStockProducts.isNotEmpty
                          ? Icons.warning
                          : Icons.inventory_2,
                      color: outOfStockProducts.isNotEmpty
                          ? Colors.red
                          : Colors.orange,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            outOfStockProducts.isNotEmpty
                                ? '${outOfStockProducts.length} product${outOfStockProducts.length > 1 ? 's' : ''} out of stock!'
                                : '${lowStockProducts.length} product${lowStockProducts.length > 1 ? 's' : ''} running low',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: outOfStockProducts.isNotEmpty
                                  ? Colors.red
                                  : Colors.orange,
                            ),
                          ),
                          if (lowStockProducts.isNotEmpty)
                            Text(
                              lowStockProducts.map((p) => p.name).take(3).join(', ') +
                                  (lowStockProducts.length > 3 ? '...' : ''),
                              style: const TextStyle(fontSize: 12, color: Colors.grey),
                            ),
                        ],
                      ),
                    ),
                    TextButton(
                      onPressed: () {
                        setState(() => _filter = outOfStockProducts.isNotEmpty ? 'out' : 'low');
                      },
                      child: const Text('VIEW'),
                    ),
                  ],
                ),
              );
            },
          ),

          // Search and filter
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                TextField(
                  decoration: InputDecoration(
                    hintText: 'Search products...',
                    prefixIcon: const Icon(Icons.search),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                  onChanged: (v) => setState(() => _searchQuery = v.toLowerCase()),
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    _buildFilterChip('All', 'all'),
                    _buildFilterChip('Low Stock', 'low'),
                    _buildFilterChip('Out of Stock', 'out'),
                    _buildFilterChip('Available', 'available'),
                  ],
                ),
              ],
            ),
          ),

          // Product list
          Expanded(
            child: StreamBuilder<List<Product>>(
              stream: _firestore
                  .collection('products')
                  .where('shopId', isEqualTo: widget.shop.id)
                  .snapshots()
                  .map((snapshot) => snapshot.docs
                      .map((doc) => Product.fromFirestore(doc))
                      .toList()),
              builder: (context, snapshot) {
                if (!snapshot.hasData) {
                  return const Center(child: CircularProgressIndicator());
                }

                var products = snapshot.data!;

                if (_searchQuery.isNotEmpty) {
                  products = products
                      .where((p) => p.name.toLowerCase().contains(_searchQuery))
                      .toList();
                }

                if (_filter == 'low') {
                  products = products.where((p) => p.stockQuantity > 0 && p.stockQuantity < 10).toList();
                } else if (_filter == 'out') {
                  products = products.where((p) => p.stockQuantity == 0).toList();
                } else if (_filter == 'available') {
                  products = products.where((p) => p.isAvailable).toList();
                }

                if (products.isEmpty) {
                  return const Center(child: Text('No products found'));
                }

                return ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: products.length,
                  itemBuilder: (context, index) {
                    return _buildProductCard(products[index]);
                  },
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String value) {
    final isSelected = _filter == value;
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (_) => setState(() => _filter = value),
        selectedColor: Colors.orange[200],
      ),
    );
  }

  Widget _buildProductCard(Product product) {
    final isLowStock = product.stockQuantity > 0 && product.stockQuantity < 10;
    final isOutOfStock = product.stockQuantity == 0;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ExpansionTile(
        leading: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: isOutOfStock ? Colors.red[100] : isLowStock ? Colors.orange[100] : Colors.green[100],
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            isOutOfStock ? Icons.block : isLowStock ? Icons.warning : Icons.inventory_2,
            color: isOutOfStock ? Colors.red : isLowStock ? Colors.orange : Colors.green,
          ),
        ),
        title: Text(product.name),
        subtitle: Text(
          'TSh ${product.price.toStringAsFixed(0)} • Stock: ${product.stockQuantity} ${product.unit ?? ''}',
        ),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: product.isAvailable ? Colors.green[100] : Colors.grey[200],
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            product.isAvailable ? 'Active' : 'Inactive',
            style: TextStyle(
              color: product.isAvailable ? Colors.green[800] : Colors.grey[600],
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        ),
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: _buildStockAction(
                        icon: Icons.add,
                        label: 'Add Stock',
                        color: Colors.green,
                        onTap: () => _adjustStock(product, true),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStockAction(
                        icon: Icons.remove,
                        label: 'Remove Stock',
                        color: Colors.red,
                        onTap: () => _adjustStock(product, false),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: _buildStockAction(
                        icon: Icons.edit,
                        label: 'Edit Product',
                        color: Colors.blue,
                        onTap: () {},
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: _buildStockAction(
                        icon: Icons.history,
                        label: 'Stock History',
                        color: Colors.purple,
                        onTap: () => _showStockHistory(product),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStockAction({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return OutlinedButton.icon(
      onPressed: onTap,
      icon: Icon(icon, size: 18, color: color),
      label: Text(label, style: TextStyle(color: color)),
      style: OutlinedButton.styleFrom(
        side: BorderSide(color: color),
      ),
    );
  }

  Future<void> _adjustStock(Product product, bool isAdding) async {
    final controller = TextEditingController();
    final result = await showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isAdding ? 'Add Stock' : 'Remove Stock'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.number,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(
            labelText: 'Quantity',
            hintText: 'Enter quantity',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final qty = int.tryParse(controller.text);
              if (qty != null && qty > 0) Navigator.pop(context, qty);
            },
            child: const Text('Confirm'),
          ),
        ],
      ),
    );

    if (result != null) {
      final change = isAdding ? result : -result;
      final newStock = product.stockQuantity + change;

      if (newStock < 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cannot remove more than current stock'), backgroundColor: Colors.red),
        );
        return;
      }

      try {
        await _firestore.collection('products').doc(product.id).update({
          'stockQuantity': newStock,
          'updatedAt': FieldValue.serverTimestamp(),
        });

        await _smeService.recordStockChange(
          shopId: widget.shop.id,
          productId: product.id,
          productName: product.name,
          quantityChange: change,
          previousStock: product.stockQuantity,
          newStock: newStock,
          type: isAdding ? StockChangeType.purchase : StockChangeType.sale,
          notes: isAdding ? 'Stock added' : 'Stock removed',
        );

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Stock updated: ${product.stockQuantity} → $newStock'), backgroundColor: Colors.green),
        );
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showStockHistory(Product product) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.6,
        maxChildSize: 0.9,
        builder: (context, scrollController) {
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Stock History: ${product.name}',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ),
              const Divider(),
              Expanded(
                child: StreamBuilder<List<StockHistory>>(
                  stream: _smeService.getProductStockHistory(widget.shop.id, product.id),
                  builder: (context, snapshot) {
                    if (!snapshot.hasData) {
                      return const Center(child: CircularProgressIndicator());
                    }
                    final history = snapshot.data!;
                    if (history.isEmpty) {
                      return const Center(child: Text('No stock history'));
                    }
                    return ListView.builder(
                      controller: scrollController,
                      itemCount: history.length,
                      itemBuilder: (context, index) {
                        final entry = history[index];
                        return ListTile(
                          leading: Icon(
                            entry.quantityChange > 0 ? Icons.arrow_upward : Icons.arrow_downward,
                            color: entry.quantityChange > 0 ? Colors.green : Colors.red,
                          ),
                          title: Text('${entry.quantityChange > 0 ? '+' : ''}${entry.quantityChange} ${entry.type.name}'),
                          subtitle: Text('${entry.previousStock} → ${entry.newStock}'),
                          trailing: Text(
                            _formatDate(entry.createdAt),
                            style: const TextStyle(fontSize: 12),
                          ),
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  void _showStockAlerts() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.warning, color: Colors.orange),
            SizedBox(width: 8),
            Text('Stock Alerts'),
          ],
        ),
        content: SizedBox(
          width: double.maxFinite,
          child: StreamBuilder<List<Product>>(
            stream: _firestore
                .collection('products')
                .where('shopId', isEqualTo: widget.shop.id)
                .snapshots()
                .map((snapshot) => snapshot.docs
                    .map((doc) => Product.fromFirestore(doc))
                    .toList()),
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }

              final lowStock = snapshot.data!
                  .where((p) => p.stockQuantity > 0 && p.stockQuantity < 10)
                  .toList();
              final outOfStock = snapshot.data!
                  .where((p) => p.stockQuantity == 0)
                  .toList();

              if (lowStock.isEmpty && outOfStock.isEmpty) {
                return const Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.check_circle, color: Colors.green, size: 48),
                      SizedBox(height: 16),
                      Text('All products are well stocked!'),
                    ],
                  ),
                );
              }

              return Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (outOfStock.isNotEmpty) ...[
                    const Text('Out of Stock', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...outOfStock.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text('• ${p.name}', style: const TextStyle(color: Colors.red)),
                    )),
                    const SizedBox(height: 16),
                  ],
                  if (lowStock.isNotEmpty) ...[
                    const Text('Low Stock', style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ...lowStock.map((p) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Text('• ${p.name} (${p.stockQuantity} left)', style: const TextStyle(color: Colors.orange)),
                    )),
                  ],
                ],
              );
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year} ${date.hour}:${date.minute.toString().padLeft(2, '0')}';
  }
}
