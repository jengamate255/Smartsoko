import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class AdminOrdersScreen extends StatefulWidget {
  const AdminOrdersScreen({super.key});

  @override
  State<AdminOrdersScreen> createState() => _AdminOrdersScreenState();
}

class _AdminOrdersScreenState extends State<AdminOrdersScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _orders = [];
  String _selectedStatus = 'all';
  String _searchQuery = '';
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      var query = client
          .from('orders')
          .select('*, customer:profiles!orders_customer_id_fkey(name, phone, email), merchant:profiles!orders_merchant_id_fkey(name, phone), driver:profiles!orders_driver_id_fkey(name, phone)')
          .order('created_at', ascending: false);

      if (_selectedStatus != 'all') {
        query = query.eq('status', _selectedStatus);
      }

      if (_searchQuery.isNotEmpty) {
        query = query.or('id.ilike.%$_searchQuery%,customer.name.ilike.%$_searchQuery%,merchant.name.ilike.%$_searchQuery%');
      }

      final response = await query
          .range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1)
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _orders = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading orders: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _updateOrderStatus(String orderId, String newStatus) async {
    try {
      final client = _supabaseService.client;
      await client.from('orders').update({
        'status': newStatus,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', orderId);
      
      _loadOrders();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Order status updated to $newStatus'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating order: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showOrderDetail(Map<String, dynamic> order) {
    final customer = order['customer'] as Map<String, dynamic>?;
    final merchant = order['merchant'] as Map<String, dynamic>?;
    final driver = order['driver'] as Map<String, dynamic>?;
    final items = order['items'] as List<dynamic>? ?? [];

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Order #${order['id'].toString().substring(0, 8)}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Status', _getStatusChip(order['status'])),
              _buildInfoRow('Customer', customer?['name'] ?? 'N/A'),
              _buildInfoRow('Customer Phone', customer?['phone'] ?? 'N/A'),
              _buildInfoRow('Merchant', merchant?['name'] ?? 'N/A'),
              _buildInfoRow('Driver', driver?['name'] ?? 'Unassigned'),
              _buildInfoRow('Total', 'TZS ${order['total']?.toString() ?? '0'}'),
              _buildInfoRow('Delivery Fee', 'TZS ${order['delivery_fee']?.toString() ?? '0'}'),
              _buildInfoRow('Created', _formatDate(order['created_at'])),
              _buildInfoRow('Updated', _formatDate(order['updated_at'])),
              const Divider(),
              const Text('Items', style: TextStyle(fontWeight: FontWeight.bold)),
              ...items.map((item) => ListTile(
                dense: true,
                title: Text(item['name'] ?? 'Unknown'),
                subtitle: Text('Qty: ${item['quantity']} x TZS ${item['price']}'),
                trailing: Text('TZS ${(item['quantity'] * item['price']).toString()}'),
              )),
              const Divider(),
              const Text('Actions', style: TextStyle(fontWeight: FontWeight.bold)),
              Wrap(
                spacing: 8,
                children: ['confirmed', 'preparing', 'ready_for_delivery', 'dispatched', 'delivered', 'cancelled']
                    .where((s) => s != order['status'])
                    .map((s) => ActionChip(
                          label: Text(s.replaceAll('_', ' ').toUpperCase()),
                          onPressed: () {
                            Navigator.pop(context);
                            _updateOrderStatus(order['id'], s);
                          },
                        ))
                    .toList(),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, Widget value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey))),
          Expanded(child: value),
        ],
      ),
    );
  }

  Widget _getStatusChip(String? status) {
    Color color;
    switch (status) {
      case 'delivered':
        color = Colors.green;
        break;
      case 'cancelled':
        color = Colors.red;
        break;
      case 'dispatched':
        color = Colors.blue;
        break;
      case 'preparing':
        color = Colors.purple;
        break;
      case 'ready_for_delivery':
        color = Colors.orange;
        break;
      case 'confirmed':
        color = Colors.indigo;
        break;
      default:
        color = Colors.amber;
    }
    return Chip(
      label: Text(status?.replaceAll('_', ' ').toUpperCase() ?? 'PENDING'),
      backgroundColor: color.withOpacity(0.1),
      labelStyle: TextStyle(color: color, fontWeight: FontWeight.bold),
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
        title: const Text('Orders Management'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: _exportOrders,
            tooltip: 'Export CSV',
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadOrders,
          ),
        ],
      ),
      body: Column(
        children: [
          // Search and Filter Bar
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
                          hintText: 'Search orders...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        onChanged: (value) {
                          _searchQuery = value;
                          _currentPage = 1;
                          _loadOrders();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedStatus,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        },
                        items: ['all', 'pending', 'confirmed', 'preparing', 'ready_for_delivery', 'dispatched', 'delivered', 'cancelled']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s.replaceAll('_', ' ').toUpperCase())))
                            .toList(),
                        onChanged: (value) {
                          _selectedStatus = value!;
                          _currentPage = 1;
                          _loadOrders();
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Orders List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _orders.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.receipt_long, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No orders found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _orders.length,
                        itemBuilder: (context, index) {
                          final order = _orders[index];
                          final customer = order['customer'] as Map<String, dynamic>?;
                          final merchant = order['merchant'] as Map<String, dynamic>?;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getStatusColor(order['status']).withOpacity(0.1),
                                child: Icon(Icons.shopping_cart, color: _getStatusColor(order['status'])),
                              ),
                              title: Text('#${order['id'].toString().substring(0, 8)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${customer?['name'] ?? 'Unknown'} | ${merchant?['name'] ?? 'Unknown'}'),
                                  Text('TZS ${order['total']?.toString() ?? '0'} • ${_formatDate(order['created_at'])}'),
                                ],
                              ),
                              trailing: _getStatusChip(order['status']),
                              onTap: () => _showOrderDetail(order),
                            ),
                          );
                        },
                      ),
          ),
          // Pagination
          if (!_isLoading)
            Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.chevron_left),
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadOrders(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _orders.length == _itemsPerPage ? () { _currentPage++; _loadOrders(); } : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'delivered': return Colors.green;
      case 'cancelled': return Colors.red;
      case 'dispatched': return Colors.blue;
      case 'preparing': return Colors.purple;
      case 'ready_for_delivery': return Colors.orange;
      case 'confirmed': return Colors.indigo;
      default: return Colors.amber;
    }
  }

  Future<void> _exportOrders() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Export functionality coming soon'), backgroundColor: Colors.blue),
    );
  }
}