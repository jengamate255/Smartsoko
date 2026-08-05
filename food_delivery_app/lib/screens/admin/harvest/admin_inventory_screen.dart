import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class AdminInventoryScreen extends StatefulWidget {
  const AdminInventoryScreen({super.key});

  @override
  State<AdminInventoryScreen> createState() => _AdminInventoryScreenState();
}

class _AdminInventoryScreenState extends State<AdminInventoryScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _products = [];
  String _searchQuery = '';
  String _selectedCategory = 'all';
  String _selectedMerchant = 'all';
  List<String> _categories = [];
  List<String> _merchants = [];
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadInventory();
  }

  Future<void> _loadInventory() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      var query = client
          .from('products')
          .select('*, merchant:profiles!products_merchant_id_fkey(name), category:categories(name)')
          .order('created_at', ascending: false);

      if (_selectedCategory != 'all') {
        query = query.eq('category_id', _selectedCategory);
      }
      if (_selectedMerchant != 'all') {
        query = query.eq('merchant_id', _selectedMerchant);
      }
      if (_searchQuery.isNotEmpty) {
        query = query.ilike('name', '%$_searchQuery%');
      }

      final [productsRes, catsRes, mersRes] = await Future.wait([
        query.range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1).count(CountOption.exact),
        client.from('categories').select('id, name'),
        client.from('profiles').select('id, name').eq('role', 'merchant'),
      ]);

      if (mounted) {
        setState(() {
          _products = List<Map<String, dynamic>>.from(productsRes.data ?? []);
          _categories = ['all', ...catsRes.data.map((c) => c['id'] as String)];
          _merchants = ['all', ...mersRes.data.map((m) => m['id'] as String)];
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading inventory: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _toggleProductStatus(String productId, bool isActive) async {
    try {
      final client = _supabaseService.client;
      await client.from('products').update({
        'is_active': isActive,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', productId);
      
      _loadInventory();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Product ${isActive ? "activated" : "deactivated"}'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showProductDetail(Map<String, dynamic> product) {
    final merchant = product['merchant'] as Map<String, dynamic>?;
    final category = product['category'] as Map<String, dynamic>?;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(product['name'] ?? 'Product Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (product['image_url'] != null)
                Image.network(product['image_url'], height: 150, width: double.infinity, fit: BoxFit.cover),
              const SizedBox(height: 16),
              _buildInfoRow('Merchant', merchant?['name'] ?? 'N/A'),
              _buildInfoRow('Category', category?['name'] ?? 'N/A'),
              _buildInfoRow('Price', 'TZS ${product['price']?.toString() ?? '0'}'),
              _buildInfoRow('Stock', product['stock']?.toString() ?? '0'),
              _buildInfoRow('Status', product['is_active'] == true ? 'Active' : 'Inactive'),
              _buildInfoRow('Description', product['description'] ?? 'N/A'),
              _buildInfoRow('Created', _formatDate(product['created_at'])),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              _toggleProductStatus(product['id'], product['is_active'] != true);
            },
            child: Text(product['is_active'] == true ? 'Deactivate' : 'Activate'),
          ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey))),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      return DateTime.parse(dateStr).toLocal().toString().substring(0, 19);
    } catch (_) {
      return dateStr;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory Management'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Export coming soon')),
            ),
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadInventory),
        ],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey[50],
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      flex: 2,
                      child: TextField(
                        decoration: InputDecoration(
                          hintText: 'Search products...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        onChanged: (value) {
                          _searchQuery = value;
                          _currentPage = 1;
                          _loadInventory();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedCategory,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        items: _categories.map((c) => DropdownMenuItem(
                          value: c, 
                          child: Text(c == 'all' ? 'All Categories' : c)
                        )).toList(),
                        onChanged: (value) {
                          _selectedCategory = value!;
                          _currentPage = 1;
                          _loadInventory();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedMerchant,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        items: _merchants.map((m) => DropdownMenuItem(
                          value: m, 
                          child: Text(m == 'all' ? 'All Merchants' : m)
                        )).toList(),
                        onChanged: (value) {
                          _selectedMerchant = value!;
                          _currentPage = 1;
                          _loadInventory();
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _products.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.inventory, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No products found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _products.length,
                        itemBuilder: (context, index) {
                          final product = _products[index];
                          final merchant = product['merchant'] as Map<String, dynamic>?;
                          final category = product['category'] as Map<String, dynamic>?;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: product['image_url'] != null
                                  ? ClipRRect(
                                      borderRadius: BorderRadius.circular(8),
                                      child: Image.network(product['image_url'], width: 50, height: 50, fit: BoxFit.cover),
                                    )
                                  : CircleAvatar(
                                      backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                                      child: Icon(Icons.fastfood, color: AppTheme.primaryColor),
                                    ),
                              title: Text(product['name'] ?? 'Unnamed', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${merchant?['name'] ?? 'N/A'} • ${category?['name'] ?? 'N/A'}'),
                                  Text('TZS ${product['price']} • Stock: ${product['stock']}'),
                                ],
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(
                                    product['is_active'] == true ? Icons.check_circle : Icons.cancel,
                                    color: product['is_active'] == true ? Colors.green : Colors.red,
                                  ),
                                  const SizedBox(width: 8),
                                  PopupMenuButton(
                                    itemBuilder: (context) => [
                                      PopupMenuItem(
                                        value: 'toggle',
                                        child: Text(product['is_active'] == true ? 'Deactivate' : 'Activate'),
                                      ),
                                      const PopupMenuItem(value: 'edit', child: Text('Edit')),
                                      const PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: Colors.red))),
                                    ],
                                    onSelected: (value) {
                                      if (value == 'toggle') {
                                        _toggleProductStatus(product['id'], product['is_active'] != true);
                                      }
                                    },
                                  ),
                                ],
                              ),
                              onTap: () => _showProductDetail(product),
                            ),
                          );
                        },
                      ),
          ),
          if (!_isLoading)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadInventory(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _products.length == _itemsPerPage ? () { _currentPage++; _loadInventory(); } : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}