import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveSuspensionsScreen extends StatefulWidget {
  const SmartMoveSuspensionsScreen({super.key});

  @override
  State<SmartMoveSuspensionsScreen> createState() => _SmartMoveSuspensionsScreenState();
}

class _SmartMoveSuspensionsScreenState extends State<SmartMoveSuspensionsScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _suspensions = [];
  String _searchQuery = '';
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadSuspensions();
  }

  Future<void> _loadSuspensions() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      var query = client
          .from('driver_suspensions')
          .select('*, driver:driver_profiles!driver_suspensions_driver_id_fkey(full_name, phone, vehicle_type, vehicle_plate)')
          .order('created_at', ascending: false);

      if (_searchQuery.isNotEmpty) {
        query = query.or('driver.full_name.ilike.%$_searchQuery%,driver.phone.ilike.%$_searchQuery%');
      }

      final response = await query
          .range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1)
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _suspensions = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading suspensions: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _liftSuspension(String suspensionId, String driverId) async {
    try {
      final client = _supabaseService.client;
      await client.from('driver_suspensions').update({
        'status': 'lifted',
        'lifted_at': DateTime.now().toIso8601String(),
        'lifted_by': (await client.auth.getUser()).user?.id,
      }).eq('id', suspensionId);
      
      await client.from('driver_profiles').update({
        'status': 'approved',
      }).eq('id', driverId);
      
      _loadSuspensions();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Suspension lifted'), backgroundColor: Colors.green),
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

  Future<void> _extendSuspension(String suspensionId) async {
    final days = await _showExtendDialog();
    if (days == null || days <= 0) return;

    try {
      final client = _supabaseService.client;
      final newEndDate = DateTime.now().add(Duration(days: days));
      await client.from('driver_suspensions').update({
        'end_date': newEndDate.toIso8601String(),
      }).eq('id', suspensionId);
      
      _loadSuspensions();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Suspension extended by $days days'), backgroundColor: Colors.orange),
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

  Future<int?> _showExtendDialog() async {
    final controller = TextEditingController();
    return showDialog<int>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Extend Suspension'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Enter number of days...'),
          keyboardType: TextInputType.number,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, int.tryParse(controller.text) ?? 0),
            child: const Text('Extend'),
          ),
        ],
      ),
    );
  }

  void _showSuspensionDetail(Map<String, dynamic> suspension) {
    final driver = suspension['driver'] as Map<String, dynamic>?;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Suspension Details'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Driver', driver?['full_name'] ?? 'N/A'),
              _buildInfoRow('Phone', driver?['phone'] ?? 'N/A'),
              _buildInfoRow('Vehicle', '${driver?['vehicle_type'] ?? ''} ${driver?['vehicle_plate'] ?? ''}'),
              _buildInfoRow('Reason', suspension['reason'] ?? 'N/A'),
              _buildInfoRow('Type', suspension['suspension_type'] ?? 'N/A'),
              _buildInfoRow('Start Date', _formatDate(suspension['start_date'])),
              _buildInfoRow('End Date', _formatDate(suspension['end_date'])),
              _buildInfoRow('Status', _getStatusChip(suspension['status'])),
              _buildInfoRow('Created By', suspension['created_by'] ?? 'N/A'),
              if (suspension['lifted_at'] != null) _buildInfoRow('Lifted', _formatDate(suspension['lifted_at'])),
            ],
          ),
        ),
        actions: [
          if (suspension['status'] == 'active') ...[
            TextButton(onPressed: () { Navigator.pop(context); _liftSuspension(suspension['id'], suspension['driver_id']); }, child: const Text('Lift Suspension')),
            TextButton(onPressed: () { Navigator.pop(context); _extendSuspension(suspension['id']); }, child: const Text('Extend')),
          ],
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

  Widget _getStatusChip(String? status) {
    Color color;
    String label;
    switch (status) {
      case 'lifted':
        color = Colors.green;
        label = 'LIFTED';
        break;
      case 'expired':
        color = Colors.grey;
        label = 'EXPIRED';
        break;
      default:
        color = Colors.red;
        label = 'ACTIVE';
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
        title: const Text('Driver Suspensions'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadSuspensions)],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey[50],
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search suspensions...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                filled: true,
                fillColor: Colors.white,
              ),
              onChanged: (value) {
                _searchQuery = value;
                _currentPage = 1;
                _loadSuspensions();
              },
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _suspensions.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.block, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No suspensions found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _suspensions.length,
                        itemBuilder: (context, index) {
                          final suspension = _suspensions[index];
                          final driver = suspension['driver'] as Map<String, dynamic>?;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            color: suspension['status'] == 'active' ? Colors.red[50] : null,
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: Colors.red.withOpacity(0.1),
                                child: Icon(Icons.block, color: Colors.red),
                              ),
                              title: Text(driver?['full_name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(suspension['reason'] ?? 'No reason'),
                                  Text('${suspension['suspension_type']} • ${_formatDate(suspension['start_date'])} to ${_formatDate(suspension['end_date'])}'),
                                ],
                              ),
                              trailing: _getStatusChip(suspension['status']),
                              onTap: () => _showSuspensionDetail(suspension),
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
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadSuspensions(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _suspensions.length == _itemsPerPage ? () { _currentPage++; _loadSuspensions(); } : null,
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}