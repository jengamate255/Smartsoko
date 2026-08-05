import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class AdminSellersScreen extends StatefulWidget {
  const AdminSellersScreen({super.key});

  @override
  State<AdminSellersScreen> createState() => _AdminSellersScreenState();
}

class _AdminSellersScreenState extends State<AdminSellersScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _sellers = [];
  String _selectedStatus = 'all';
  String _searchQuery = '';
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadSellers();
  }

  Future<void> _loadSellers() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      var query = client
          .from('sellers')
          .select('*')
          .order('created_at', ascending: false);

      if (_selectedStatus == 'active') {
        query = query.eq('is_open', true);
      } else if (_selectedStatus == 'inactive') {
        query = query.eq('is_open', false);
      }

      if (_searchQuery.isNotEmpty) {
        query = query.or('name.ilike.%$_searchQuery%,email.ilike.%$_searchQuery%,phone.ilike.%$_searchQuery%');
      }

      final response = await query
          .range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1)
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _sellers = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading sellers: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _updateSellerStatus(String sellerId, bool isOpen) async {
    try {
      final client = _supabaseService.client;
      await client.from('sellers').update({
        'is_open': isOpen,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', sellerId);
      
      _loadSellers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Seller ${isOpen ? "activated" : "deactivated"}'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating seller: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _approveSeller(String sellerId) async {
    try {
      final client = _supabaseService.client;
      await client.from('sellers').update({
        'is_verified': true,
        'status': 'approved',
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', sellerId);
      
      // Also update user profile
      final seller = _sellers.firstWhere((s) => s['id'] == sellerId);
      if (seller['user_id'] != null) {
        await client.from('profiles').update({
          'role': 'merchant',
          'updated_at': DateTime.now().toIso8601String(),
        }).eq('id', seller['user_id']);
      }
      
      _loadSellers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Seller approved'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error approving seller: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _rejectSeller(String sellerId) async {
    final reason = await _showReasonDialog('Reject Seller');
    if (reason == null || reason.isEmpty) return;

    try {
      final client = _supabaseService.client;
      await client.from('sellers').update({
        'status': 'rejected',
        'rejection_reason': reason,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', sellerId);
      
      _loadSellers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Seller rejected'), backgroundColor: Colors.orange),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error rejecting seller: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<String?> _showReasonDialog(String title) async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Enter reason...'),
          maxLines: 3,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text),
            child: const Text('Submit'),
          ),
        ],
      ),
    );
  }

  void _showSellerDetail(Map<String, dynamic> seller) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(seller['name'] ?? 'Seller Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Email', seller['email'] ?? 'N/A'),
              _buildInfoRow('Phone', seller['phone'] ?? 'N/A'),
              _buildInfoRow('Category', seller['category'] ?? 'N/A'),
              _buildInfoRow('City', seller['city'] ?? 'N/A'),
              _buildInfoRow('Address', seller['address'] ?? 'N/A'),
              _buildInfoRow('Status', _getStatusChip(seller['is_open'] == true, seller['status'])),
              _buildInfoRow('Verified', seller['is_verified'] == true ? 'Yes' : 'No'),
              _buildInfoRow('Rating', seller['rating']?.toString() ?? 'N/A'),
              _buildInfoRow('Total Orders', seller['total_orders']?.toString() ?? '0'),
              _buildInfoRow('Created', _formatDate(seller['created_at'])),
            ],
          ),
        ),
        actions: [
          if (seller['status'] == 'pending')
            TextButton(onPressed: () { Navigator.pop(context); _approveSeller(seller['id']); }, child: const Text('Approve')),
          if (seller['status'] == 'pending')
            TextButton(onPressed: () { Navigator.pop(context); _rejectSeller(seller['id']); }, child: const Text('Reject')),
          if (seller['status'] != 'pending')
            TextButton(
              onPressed: () { Navigator.pop(context); _updateSellerStatus(seller['id'], seller['is_open'] != true); },
              child: Text(seller['is_open'] == true ? 'Deactivate' : 'Activate'),
            ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, dynamic value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 100, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey))),
          Expanded(child: Text(value.toString())),
        ],
      ),
    );
  }

  Widget _getStatusChip(bool isOpen, String? status) {
    Color color;
    String label;
    if (status == 'pending') {
      color = Colors.amber;
      label = 'PENDING';
    } else if (status == 'rejected') {
      color = Colors.red;
      label = 'REJECTED';
    } else if (isOpen) {
      color = Colors.green;
      label = 'ACTIVE';
    } else {
      color = Colors.grey;
      label = 'INACTIVE';
    }
    return Chip(
      label: Text(label),
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
        title: const Text('Sellers Management'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Export coming soon')),
            ),
          ),
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadSellers,
          ),
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
                          hintText: 'Search sellers...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        onChanged: (value) {
                          _searchQuery = value;
                          _currentPage = 1;
                          _loadSellers();
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
                        ),
                        items: ['all', 'active', 'inactive', 'pending']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase())))
                            .toList(),
                        onChanged: (value) {
                          _selectedStatus = value!;
                          _currentPage = 1;
                          _loadSellers();
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
                : _sellers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.store, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No sellers found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _sellers.length,
                        itemBuilder: (context, index) {
                          final seller = _sellers[index];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getStatusColor(seller).withOpacity(0.1),
                                child: Icon(Icons.store, color: _getStatusColor(seller)),
                              ),
                              title: Text(seller['name'] ?? 'Unnamed', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${seller['category'] ?? 'N/A'} • ${seller['city'] ?? ''}'),
                                  Text('${seller['phone'] ?? ''} • ${_formatDate(seller['created_at'])}'),
                                ],
                              ),
                              trailing: _getStatusChip(seller['is_open'] == true, seller['status']),
                              onTap: () => _showSellerDetail(seller),
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
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadSellers(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _sellers.length == _itemsPerPage ? () { _currentPage++; _loadSellers(); } : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Color _getStatusColor(Map<String, dynamic> seller) {
    final status = seller['status'];
    if (status == 'pending') return Colors.amber;
    if (status == 'rejected') return Colors.red;
    return seller['is_open'] == true ? Colors.green : Colors.grey;
  }
}