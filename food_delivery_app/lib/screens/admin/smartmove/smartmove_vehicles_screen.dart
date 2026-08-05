import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveVehiclesScreen extends StatefulWidget {
  const SmartMoveVehiclesScreen({super.key});

  @override
  State<SmartMoveVehiclesScreen> createState() => _SmartMoveVehiclesScreenState();
}

class _SmartMoveVehiclesScreenState extends State<SmartMoveVehiclesScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _vehicles = [];
  String _searchQuery = '';
  String _selectedStatus = 'all';
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadVehicles();
  }

  Future<void> _loadVehicles() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      var query = client
          .from('driver_vehicles')
          .select('*, driver:driver_profiles!driver_vehicles_driver_id_fkey(full_name, phone)')
          .order('created_at', ascending: false);

      if (_selectedStatus != 'all') {
        query = query.eq('status', _selectedStatus);
      }

      if (_searchQuery.isNotEmpty) {
        query = query.or('vehicle_plate.ilike.%$_searchQuery%,vehicle_type.ilike.%$_searchQuery%,driver.full_name.ilike.%$_searchQuery%');
      }

      final response = await query
          .range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1)
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _vehicles = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading vehicles: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _approveVehicle(String vehicleId) async {
    try {
      final client = _supabaseService.client;
      await client.from('driver_vehicles').update({
        'status': 'approved',
        'approved_at': DateTime.now().toIso8601String(),
      }).eq('id', vehicleId);
      
      _loadVehicles();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vehicle approved'), backgroundColor: Colors.green),
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

  Future<void> _rejectVehicle(String vehicleId) async {
    final reason = await _showReasonDialog('Reject Vehicle');
    if (reason == null || reason.isEmpty) return;

    try {
      final client = _supabaseService.client;
      await client.from('driver_vehicles').update({
        'status': 'rejected',
        'rejection_reason': reason,
      }).eq('id', vehicleId);
      
      _loadVehicles();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Vehicle rejected'), backgroundColor: Colors.orange),
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

  void _showVehicleDetail(Map<String, dynamic> vehicle) {
    final driver = vehicle['driver'] as Map<String, dynamic>?;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Vehicle: ${vehicle['vehicle_plate'] ?? 'N/A'}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Driver', driver?['full_name'] ?? 'N/A'),
              _buildInfoRow('Phone', driver?['phone'] ?? 'N/A'),
              _buildInfoRow('Type', vehicle['vehicle_type'] ?? 'N/A'),
              _buildInfoRow('Model', vehicle['vehicle_model'] ?? 'N/A'),
              _buildInfoRow('Color', vehicle['vehicle_color'] ?? 'N/A'),
              _buildInfoRow('Year', vehicle['vehicle_year']?.toString() ?? 'N/A'),
              _buildInfoRow('Plate', vehicle['vehicle_plate'] ?? 'N/A'),
              _buildInfoRow('Status', _getStatusChip(vehicle['status'])),
              _buildInfoRow('Submitted', _formatDate(vehicle['created_at'])),
              if (vehicle['rejection_reason'] != null) _buildInfoRow('Rejection Reason', vehicle['rejection_reason']),
              const Divider(),
              if (vehicle['photo_url'] != null) ...[
                const Text('Vehicle Photo:', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.network(
                    vehicle['photo_url'],
                    height: 200,
                    width: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, __, ___) => Container(
                      height: 200,
                      color: Colors.grey[200],
                      child: const Center(child: Text('Unable to load image')),
                    ),
                  ),
                ),
              ],
            ],
          ),
        ),
        actions: [
          if (vehicle['status'] == 'pending') ...[
            TextButton(onPressed: () { Navigator.pop(context); _approveVehicle(vehicle['id']); }, child: const Text('Approve')),
            TextButton(onPressed: () { Navigator.pop(context); _rejectVehicle(vehicle['id']); }, child: const Text('Reject')),
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
      case 'approved':
        color = Colors.green;
        label = 'APPROVED';
        break;
      case 'rejected':
        color = Colors.red;
        label = 'REJECTED';
        break;
      default:
        color = Colors.amber;
        label = 'PENDING';
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
        title: const Text('Vehicle Approvals'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadVehicles)],
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
                          hintText: 'Search vehicles...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        onChanged: (value) {
                          _searchQuery = value;
                          _currentPage = 1;
                          _loadVehicles();
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
                        items: ['all', 'pending', 'approved', 'rejected']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s.toUpperCase())))
                            .toList(),
                        onChanged: (value) {
                          _selectedStatus = value!;
                          _currentPage = 1;
                          _loadVehicles();
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
                : _vehicles.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.directions_car, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No vehicles found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _vehicles.length,
                        itemBuilder: (context, index) {
                          final vehicle = _vehicles[index];
                          final driver = vehicle['driver'] as Map<String, dynamic>?;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getStatusColor(vehicle['status']).withOpacity(0.1),
                                child: Icon(Icons.directions_car, color: _getStatusColor(vehicle['status'])),
                              ),
                              title: Text('${vehicle['vehicle_type'] ?? ''} ${vehicle['vehicle_plate'] ?? ''}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(driver?['full_name'] ?? 'Unknown'),
                                  Text('${vehicle['vehicle_model'] ?? ''} • ${_formatDate(vehicle['created_at'])}'),
                                ],
                              ),
                              trailing: _getStatusChip(vehicle['status']),
                              onTap: () => _showVehicleDetail(vehicle),
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
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadVehicles(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _vehicles.length == _itemsPerPage ? () { _currentPage++; _loadVehicles(); } : null,
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
      case 'approved': return Colors.green;
      case 'rejected': return Colors.red;
      default: return Colors.amber;
    }
  }
}