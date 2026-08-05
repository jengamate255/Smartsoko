import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class AdminFleetScreen extends StatefulWidget {
  const AdminFleetScreen({super.key});

  @override
  State<AdminFleetScreen> createState() => _AdminFleetScreenState();
}

class _AdminFleetScreenState extends State<AdminFleetScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _drivers = [];
  String _searchQuery = '';
  String _selectedStatus = 'all';
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadDrivers();
  }

  Future<void> _loadDrivers() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      var query = client
          .from('driver_profiles')
          .select('*, wallet:wallets(balance, total_earned)')
          .order('created_at', ascending: false);

      if (_selectedStatus == 'online') {
        query = query.eq('is_online', true);
      } else if (_selectedStatus == 'offline') {
        query = query.eq('is_online', false);
      } else if (_selectedStatus == 'pending') {
        query = query.eq('status', 'pending');
      } else if (_selectedStatus == 'approved') {
        query = query.eq('status', 'approved');
      } else if (_selectedStatus == 'suspended') {
        query = query.eq('status', 'suspended');
      }

      if (_searchQuery.isNotEmpty) {
        query = query.or('full_name.ilike.%$_searchQuery%,phone.ilike.%$_searchQuery%,vehicle_plate.ilike.%$_searchQuery%');
      }

      final response = await query
          .range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1)
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _drivers = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading drivers: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _updateDriverStatus(String driverId, String newStatus) async {
    try {
      final client = _supabaseService.client;
      await client.from('driver_profiles').update({
        'status': newStatus,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', driverId);
      
      _loadDrivers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Driver status updated to $newStatus'), backgroundColor: Colors.green),
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

  Future<void> _suspendDriver(String driverId) async {
    final reason = await _showReasonDialog('Suspend Driver');
    if (reason == null || reason.isEmpty) return;

    try {
      final client = _supabaseService.client;
      await client.from('driver_profiles').update({
        'status': 'suspended',
        'suspension_reason': reason,
        'updated_at': DateTime.now().toIso8601String(),
      }).eq('id', driverId);
      
      _loadDrivers();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Driver suspended'), backgroundColor: Colors.orange),
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

  void _showDriverDetail(Map<String, dynamic> driver) {
    final wallet = driver['wallet'] as List<dynamic>?;
    final balance = wallet?.isNotEmpty == true ? wallet!.first['balance'] ?? 0 : 0;
    final totalEarned = wallet?.isNotEmpty == true ? wallet!.first['total_earned'] ?? 0 : 0;

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(driver['full_name'] ?? 'Driver Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Phone', driver['phone'] ?? 'N/A'),
              _buildInfoRow('Email', driver['email'] ?? 'N/A'),
              _buildInfoRow('Vehicle', '${driver['vehicle_type'] ?? ''} ${driver['vehicle_plate'] ?? ''}'),
              _buildInfoRow('License', driver['license_number'] ?? 'N/A'),
              _buildInfoRow('Status', _getStatusChip(driver['status'], driver['is_online'])),
              _buildInfoRow('Online', driver['is_online'] == true ? 'Yes' : 'No'),
              _buildInfoRow('Rating', driver['rating']?.toString() ?? 'N/A'),
              _buildInfoRow('Total Trips', driver['total_trips']?.toString() ?? '0'),
              _buildInfoRow('Wallet Balance', 'TZS $balance'),
              _buildInfoRow('Total Earned', 'TZS $totalEarned'),
              _buildInfoRow('Created', _formatDate(driver['created_at'])),
              const Divider(),
              const Text('Actions', style: TextStyle(fontWeight: FontWeight.bold)),
              Wrap(
                spacing: 8,
                children: [
                  if (driver['status'] == 'pending')
                    ActionChip(label: const Text('Approve'), onPressed: () { Navigator.pop(context); _updateDriverStatus(driver['id'], 'approved'); }),
                  if (driver['status'] == 'pending')
                    ActionChip(label: const Text('Reject'), onPressed: () { Navigator.pop(context); _updateDriverStatus(driver['id'], 'rejected'); }),
                  if (driver['status'] == 'approved')
                    ActionChip(label: const Text('Suspend'), onPressed: () { Navigator.pop(context); _suspendDriver(driver['id']); }),
                  if (driver['status'] == 'suspended')
                    ActionChip(label: const Text('Reactivate'), onPressed: () { Navigator.pop(context); _updateDriverStatus(driver['id'], 'approved'); }),
                ],
              ),
            ],
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
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

  Widget _getStatusChip(String? status, bool? isOnline) {
    Color color;
    String label;
    if (status == 'pending') {
      color = Colors.amber;
      label = 'PENDING';
    } else if (status == 'rejected') {
      color = Colors.red;
      label = 'REJECTED';
    } else if (status == 'suspended') {
      color = Colors.red;
      label = 'SUSPENDED';
    } else if (status == 'approved' && isOnline == true) {
      color = Colors.green;
      label = 'ONLINE';
    } else if (status == 'approved') {
      color = Colors.blue;
      label = 'OFFLINE';
    } else {
      color = Colors.grey;
      label = 'UNKNOWN';
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
        title: const Text('Fleet Management'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Export coming soon')),
            ),
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadDrivers),
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
                          hintText: 'Search drivers...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        onChanged: (value) {
                          _searchQuery = value;
                          _currentPage = 1;
                          _loadDrivers();
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
                        items: ['all', 'online', 'offline', 'pending', 'approved', 'suspended']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase())))
                            .toList(),
                        onChanged: (value) {
                          _selectedStatus = value!;
                          _currentPage = 1;
                          _loadDrivers();
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
                : _drivers.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.local_shipping, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No drivers found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _drivers.length,
                        itemBuilder: (context, index) {
                          final driver = _drivers[index];
                          final wallet = driver['wallet'] as List<dynamic>?;
                          final balance = wallet?.isNotEmpty == true ? wallet!.first['balance'] ?? 0 : 0;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getDriverColor(driver).withOpacity(0.1),
                                child: Icon(Icons.person, color: _getDriverColor(driver)),
                              ),
                              title: Text(driver['full_name'] ?? 'Unnamed', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${driver['vehicle_type'] ?? ''} ${driver['vehicle_plate'] ?? ''}'),
                                  Text('Trips: ${driver['total_trips'] ?? 0} • Rating: ${driver['rating']?.toString() ?? 'N/A'} • TZS $balance'),
                                ],
                              ),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  _getStatusChip(driver['status'], driver['is_online']),
                                  const SizedBox(width: 8),
                                  Icon(
                                    driver['is_online'] == true ? Icons.circle : Icons.circle_outlined,
                                    color: driver['is_online'] == true ? Colors.green : Colors.grey,
                                    size: 16,
                                  ),
                                ],
                              ),
                              onTap: () => _showDriverDetail(driver),
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
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadDrivers(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _drivers.length == _itemsPerPage ? () { _currentPage++; _loadDrivers(); } : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  Color _getDriverColor(Map<String, dynamic> driver) {
    final status = driver['status'];
    if (status == 'pending') return Colors.amber;
    if (status == 'suspended' || status == 'rejected') return Colors.red;
    if (status == 'approved' && driver['is_online'] == true) return Colors.green;
    if (status == 'approved') return Colors.blue;
    return Colors.grey;
  }
}