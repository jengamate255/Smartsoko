import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveRidesScreen extends StatefulWidget {
  const SmartMoveRidesScreen({super.key});

  @override
  State<SmartMoveRidesScreen> createState() => _SmartMoveRidesScreenState();
}

class _SmartMoveRidesScreenState extends State<SmartMoveRidesScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _rides = [];
  String _selectedStatus = 'all';
  String _searchQuery = '';
  String _dateRange = '7d';
  int _currentPage = 1;
  final int _itemsPerPage = 20;

  @override
  void initState() {
    super.initState();
    _loadRides();
  }

  Future<void> _loadRides() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      var query = client.from('rides').select('''
        *,
        customer:profiles!rides_customer_id_fkey(full_name, phone),
        driver:driver_profiles!rides_driver_id_fkey(full_name, phone, vehicle_type, vehicle_plate)
      ''').order('created_at', ascending: false);

      if (_selectedStatus != 'all') {
        query = query.eq('status', _selectedStatus);
      }

      if (_searchQuery.isNotEmpty) {
        query = query.or('id.ilike.%$_searchQuery%,customer.full_name.ilike.%$_searchQuery%,driver.full_name.ilike.%$_searchQuery%');
      }

      // Date range filter
      DateTime startDate;
      switch (_dateRange) {
        case '24h': startDate = DateTime.now().subtract(const Duration(hours: 24)); break;
        case '7d': startDate = DateTime.now().subtract(const Duration(days: 7)); break;
        case '30d': startDate = DateTime.now().subtract(const Duration(days: 30)); break;
        default: startDate = DateTime.now().subtract(const Duration(days: 7));
      }
      query = query.gte('created_at', startDate.toIso8601String());

      final response = await query
          .range((_currentPage - 1) * _itemsPerPage, _currentPage * _itemsPerPage - 1)
          .count(CountOption.exact);

      if (mounted) {
        setState(() {
          _rides = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading rides: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showRideDetail(Map<String, dynamic> ride) {
    final customer = ride['customer'] as Map<String, dynamic>?;
    final driver = ride['driver'] as Map<String, dynamic>?;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Ride #${ride['id'].toString().substring(0, 8)}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Status', _getStatusChip(ride['status'])),
              _buildInfoRow('Customer', customer?['full_name'] ?? 'N/A'),
              _buildInfoRow('Customer Phone', customer?['phone'] ?? 'N/A'),
              _buildInfoRow('Driver', driver?['full_name'] ?? 'Unassigned'),
              _buildInfoRow('Driver Phone', driver?['phone'] ?? 'N/A'),
              _buildInfoRow('Vehicle', '${driver?['vehicle_type'] ?? ''} ${driver?['vehicle_plate'] ?? ''}'),
              _buildInfoRow('Pickup', ride['pickup_address'] ?? 'N/A'),
              _buildInfoRow('Dropoff', ride['dropoff_address'] ?? 'N/A'),
              _buildInfoRow('Distance', '${ride['distance_km']?.toString() ?? 'N/A'} km'),
              _buildInfoRow('Duration', '${ride['duration_minutes']?.toString() ?? 'N/A'} min'),
              _buildInfoRow('Fare', 'TZS ${ride['total_fare']?.toString() ?? '0'}'),
              _buildInfoRow('Payment', ride['payment_method'] ?? 'N/A'),
              _buildInfoRow('Created', _formatDate(ride['created_at'])),
              _buildInfoRow('Started', ride['started_at'] != null ? _formatDate(ride['started_at']) : 'Not started'),
              _buildInfoRow('Completed', ride['completed_at'] != null ? _formatDate(ride['completed_at']) : 'Not completed'),
            ],
          ),
        ),
        actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close'))],
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
    String label;
    switch (status) {
      case 'completed': color = Colors.green; label = 'COMPLETED'; break;
      case 'cancelled': color = Colors.red; label = 'CANCELLED'; break;
      case 'in_progress': color = Colors.green; label = 'IN PROGRESS'; break;
      case 'driver_arrived': color = Colors.purple; label = 'ARRIVED'; break;
      case 'driver_en_route': color = Colors.orange; label = 'EN ROUTE'; break;
      case 'assigned': color = Colors.blue; label = 'ASSIGNED'; break;
      case 'pending': color = Colors.amber; label = 'PENDING'; break;
      default: color = Colors.grey; label = status?.toUpperCase() ?? 'UNKNOWN';
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
        title: const Text('Ride History'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadRides)],
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
                          hintText: 'Search rides...',
                          prefixIcon: const Icon(Icons.search),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        onChanged: (value) {
                          _searchQuery = value;
                          _currentPage = 1;
                          _loadRides();
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
                        items: ['all', 'pending', 'assigned', 'driver_en_route', 'driver_arrived', 'in_progress', 'completed', 'cancelled']
                            .map((s) => DropdownMenuItem(value: s, child: Text(s.replaceAll('_', ' ').toUpperCase())))
                            .toList(),
                        onChanged: (value) {
                          _selectedStatus = value!;
                          _currentPage = 1;
                          _loadRides();
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _dateRange,
                        decoration: InputDecoration(
                          labelText: 'Date Range',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          filled: true,
                          fillColor: Colors.white,
                        ),
                        items: ['24h', '7d', '30d'].map((d) => DropdownMenuItem(value: d, child: Text(d))).toList(),
                        onChanged: (value) {
                          _dateRange = value!;
                          _currentPage = 1;
                          _loadRides();
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
                : _rides.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.history, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No rides found', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(16),
                        itemCount: _rides.length,
                        itemBuilder: (context, index) {
                          final ride = _rides[index];
                          final customer = ride['customer'] as Map<String, dynamic>?;
                          final driver = ride['driver'] as Map<String, dynamic>?;
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: _getStatusColor(ride['status']).withOpacity(0.1),
                                child: Icon(Icons.local_taxi, color: _getStatusColor(ride['status'])),
                              ),
                              title: Text('#${ride['id'].toString().substring(0, 8)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('${customer?['full_name'] ?? 'Unknown'} → ${ride['dropoff_address'] ?? 'N/A'}'),
                                  Text('Driver: ${driver?['full_name'] ?? 'Unassigned'} • ${_formatDate(ride['created_at'])}'),
                                ],
                              ),
                              trailing: _getStatusChip(ride['status']),
                              onTap: () => _showRideDetail(ride),
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
                    onPressed: _currentPage > 1 ? () { _currentPage--; _loadRides(); } : null,
                  ),
                  Text('Page $_currentPage'),
                  IconButton(
                    icon: const Icon(Icons.chevron_right),
                    onPressed: _rides.length == _itemsPerPage ? () { _currentPage++; _loadRides(); } : null,
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
      case 'completed': return Colors.green;
      case 'cancelled': return Colors.red;
      case 'in_progress': return Colors.green;
      case 'driver_arrived': return Colors.purple;
      case 'driver_en_route': return Colors.orange;
      case 'assigned': return Colors.blue;
      case 'pending': return Colors.amber;
      default: return Colors.grey;
    }
  }
}