import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class AdminUsersScreen extends StatefulWidget {
  const AdminUsersScreen({super.key});

  @override
  State<AdminUsersScreen> createState() => _AdminUsersScreenState();
}

class _AdminUsersScreenState extends State<AdminUsersScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _users = [];
  String _selectedRole = 'all';
  String _searchQuery = '';
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadUsers();
  }

  Future<void> _loadUsers() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      var query = client
          .from('profiles')
          .select('*, wallet:wallets(balance, total_earned)')
          .order('created_at', ascending: false);

      if (_selectedRole != 'all') {
        query = query.eq('role', _selectedRole);
      }

      if (_searchQuery.isNotEmpty) {
        query = query.or('name.ilike.%$_searchQuery%,email.ilike.%$_searchQuery%,phone.ilike.%$_searchQuery%');
      }

      final response = await query
          .range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1)
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _users = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading users: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _updateUserRole(String userId, String newRole) async {
    try {
      final client = _supabaseService.client;
      await client.from('profiles').update({
        'role': newRole,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', userId);
      
      _loadUsers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User role updated to $newRole'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating user: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _toggleUserStatus(String userId, bool isActive) async {
    try {
      final client = _supabaseService.client;
      await client.from('profiles').update({
        'is_active': isActive,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', userId);
      
      _loadUsers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('User ${isActive ? "activated" : "deactivated"}'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error updating user: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showUserDetail(Map<String, dynamic> user) {
    final wallet = user['wallet'] as List<dynamic>?;
    final balance = wallet?.isNotEmpty == true ? wallet!.first['balance'] ?? 0 : 0;
    final totalEarned = wallet?.isNotEmpty == true ? wallet!.first['total_earned'] ?? 0 : 0;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(user['name'] ?? 'User Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Email', user['email'] ?? 'N/A'),
              _buildInfoRow('Phone', user['phone'] ?? 'N/A'),
              _buildInfoRow('Role', _getRoleChip(user['role'])),
              _buildInfoRow('Status', user['is_active'] == true ? 'Active' : 'Inactive'),
              _buildInfoRow('Wallet Balance', 'TZS $balance'),
              _buildInfoRow('Total Earned', 'TZS $totalEarned'),
              _buildInfoRow('Loyalty Points', user['loyalty_points']?.toString() ?? '0'),
              _buildInfoRow('Created', _formatDate(user['created_at'])),
              _buildInfoRow('Last Login', user['last_login'] != null ? _formatDate(user['last_login']) : 'Never'),
              const Divider(),
              const Text('Actions', style: TextStyle(fontWeight: FontWeight.bold)),
              Wrap(
                spacing: 8,
                children: ['customer', 'merchant', 'driver', 'admin']
                    .where((r) => r != user['role'])
                    .map((r) => ActionChip(
                          label: Text(r.toUpperCase()),
                          onPressed: () {
                            Navigator.pop(context);
                            _updateUserRole(user['id'], r);
                          },
                        ))
                    .toList(),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () { Navigator.pop(context); _toggleUserStatus(user['id'], user['is_active'] != true); },
            child: Text(user['is_active'] == true ? 'Deactivate' : 'Activate'),
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
          Expanded(child: value is Widget ? value : Text(value.toString())),
        ],
      ),
    );
  }

  Widget _getRoleChip(String? role) {
    Color color;
    switch (role) {
      case 'admin': color = Colors.red; break;
      case 'merchant': color = Colors.purple; break;
      case 'driver': color = Colors.blue; break;
      default: color = Colors.grey;
    }
    return Chip(
      label: Text(role?.toUpperCase() ?? 'CUSTOMER'),
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
        title: const Text('Users Management'),
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
            onPressed: _loadUsers,
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
                          hintText: 'Search users...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        onChanged: (value) {
                          _searchQuery = value;
                          _currentPage = 1;
                          _loadUsers();
                        },
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedRole,
                        decoration: InputDecoration(
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        items: ['all', 'customer', 'merchant', 'driver', 'admin']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase())))
                            .toList(),
                        onChanged: (value) {
                          _selectedRole = value!;
                          _currentPage = 1;
                          _loadUsers();
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
                : _users.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.people, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No users found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _users.length,
                        itemBuilder: (context, index) {
                          final user = _users[index];
                          final wallet = user['wallet'] as List<dynamic>?;
                          final balance = wallet?.isNotEmpty == true ? wallet!.first['balance'] ?? 0 : 0;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getRoleColor(user['role']).withOpacity(0.1),
                                child: Icon(_getRoleIcon(user['role']), color: _getRoleColor(user['role'])),
                              ),
                              title: Text(user['name'] ?? 'Unnamed', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${user['email'] ?? ''} • ${user['phone'] ?? ''}'),
                                  Text('Balance: TZS $balance • ${_formatDate(user['created_at'])}'),
                                ],
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _getRoleChip(user['role']),
                                  const SizedBox(width: 8),
                                  Icon(
                                    user['is_active'] == true ? Icons.check_circle : Icons.cancel,
                                    color: user['is_active'] == true ? Colors.green : Colors.red,
                                  ),
                                ],
                              ),
                              onTap: () => _showUserDetail(user),
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
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadUsers(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _users.length == _itemsPerPage ? () { _currentPage++; _loadUsers(); } : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Color _getRoleColor(String? role) {
    switch (role) {
      case 'admin': return Colors.red;
      case 'merchant': return Colors.purple;
      case 'driver': return Colors.blue;
      default: return Colors.grey;
    }
  }

  IconData _getRoleIcon(String? role) {
    switch (role) {
      case 'admin': return Icons.admin_panel_settings;
      case 'merchant': return Icons.store;
      case 'driver': return Icons.local_shipping;
      default: return Icons.person;
    }
  }
}