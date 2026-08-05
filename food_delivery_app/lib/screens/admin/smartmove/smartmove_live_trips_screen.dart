import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveLiveTripsScreen extends StatefulWidget {
  const SmartMoveLiveTripsScreen({super.key});

  @override
  State<SmartMoveLiveTripsScreen> createState() => _SmartMoveLiveTripsScreenState();
}

class _SmartMoveLiveTripsScreenState extends State<SmartMoveLiveTripsScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _liveTrips = [];
  Stream? _tripsStream;

  @override
  void initState() {
    super.initState();
    _loadLiveTrips();
    _startRealtimeSubscription();
  }

  @override
  void dispose() {
    _tripsStream?.cancel();
    super.dispose();
  }

  Future<void> _loadLiveTrips() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      final response = await client.from('rides').select('''
        *,
        customer:profiles!rides_customer_id_fkey(full_name, phone),
        driver:driver_profiles!rides_driver_id_fkey(full_name, phone, vehicle_type, vehicle_plate)
      ''').inFilter('status', ['assigned', 'driver_en_route', 'driver_arrived', 'in_progress']).order('created_at', ascending: false);

      if (mounted) {
        setState(() {
          _liveTrips = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading live trips: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _startRealtimeSubscription() {
    try {
      final client = _supabaseService.client;
      _tripsStream = client.from('rides').stream(primaryKey: ['id']).listen((changes) {
        if (mounted) _loadLiveTrips();
      });
    } catch (e) {
      // Realtime may not be available
    }
  }

  void _showTripDetail(Map<String, dynamic> trip) {
    final customer = trip['customer'] as Map<String, dynamic>?;
    final driver = trip['driver'] as Map<String, dynamic>?;
    
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Trip #${trip['id'].toString().substring(0, 8)}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildInfoRow('Status', _getStatusChip(trip['status'])),
              _buildInfoRow('Customer', customer?['full_name'] ?? 'N/A'),
              _buildInfoRow('Customer Phone', customer?['phone'] ?? 'N/A'),
              _buildInfoRow('Driver', driver?['full_name'] ?? 'Unassigned'),
              _buildInfoRow('Driver Phone', driver?['phone'] ?? 'N/A'),
              _buildInfoRow('Vehicle', '${driver?['vehicle_type'] ?? ''} ${driver?['vehicle_plate'] ?? ''}'),
              _buildInfoRow('Pickup', trip['pickup_address'] ?? 'N/A'),
              _buildInfoRow('Dropoff', trip['dropoff_address'] ?? 'N/A'),
              _buildInfoRow('Distance', '${trip['distance_km']?.toString() ?? 'N/A'} km'),
              _buildInfoRow('Fare', 'TZS ${trip['total_fare']?.toString() ?? '0'}'),
              _buildInfoRow('Created', _formatDate(trip['created_at'])),
              _buildInfoRow('Started', trip['started_at'] != null ? _formatDate(trip['started_at']) : 'Not started'),
            ],
          ),
        ),
        actions: [
          if (['assigned', 'driver_en_route', 'driver_arrived'].contains(trip['status']))
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _forceCompleteTrip(trip['id']);
              },
              child: const Text('Force Complete', style: TextStyle(color: Colors.orange)),
            ),
          if (['assigned', 'driver_en_route', 'driver_arrived', 'in_progress'].contains(trip['status']))
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _cancelTrip(trip['id']);
              },
              child: const Text('Cancel Trip', style: TextStyle(color: Colors.red)),
            ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  Future<void> _cancelTrip(String tripId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Trip'),
        content: const Text('Are you sure you want to cancel this trip? This will notify the driver and customer.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('No')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Yes', style: TextStyle(color: Colors.red))),
        ],
      ),
    );
    
    if (confirmed != true) return;
    
    try {
      final client = _supabaseService.client;
      await client.from('rides').update({
        'status': 'cancelled',
        'cancelled_at': DateTime.now().toIso8601String(),
        'cancelled_by': 'admin',
      }).eq('id', tripId);
      
      _loadLiveTrips();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trip cancelled'), backgroundColor: Colors.orange),
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

  Future<void> _forceCompleteTrip(String tripId) async {
    try {
      final client = _supabaseService.client;
      await client.from('rides').update({
        'status': 'completed',
        'completed_at': DateTime.now().toIso8601String(),
      }).eq('id', tripId);
      
      _loadLiveTrips();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Trip marked as completed'), backgroundColor: Colors.green),
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
      case 'assigned':
        color = Colors.blue;
        label = 'ASSIGNED';
        break;
      case 'driver_en_route':
        color = Colors.orange;
        label = 'EN ROUTE';
        break;
      case 'driver_arrived':
        color = Colors.purple;
        label = 'ARRIVED';
        break;
      case 'in_progress':
        color = Colors.green;
        label = 'IN PROGRESS';
        break;
      case 'completed':
        color = Colors.teal;
        label = 'COMPLETED';
        break;
      case 'cancelled':
        color = Colors.red;
        label = 'CANCELLED';
        break;
      default:
        color = Colors.grey;
        label = status?.toUpperCase() ?? 'UNKNOWN';
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
        title: const Text('Live Trips'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadLiveTrips)],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _liveTrips.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.directions_car, size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text('No live trips', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _liveTrips.length,
                  itemBuilder: (context, index) {
                    final trip = _liveTrips[index];
                    final customer = trip['customer'] as Map<String, dynamic>?;
                    final driver = trip['driver'] as Map<String, dynamic>?;
                    return Card(
                      margin: const EdgeInsets.only(bottom: 12),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: _getStatusColor(trip['status']).withOpacity(0.1),
                          child: Icon(Icons.directions_car, color: _getStatusColor(trip['status'])),
                        ),
                        title: Text('#${trip['id'].toString().substring(0, 8)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${customer?['full_name'] ?? 'Unknown'} → ${trip['dropoff_address'] ?? 'N/A'}'),
                            Text('Driver: ${driver?['full_name'] ?? 'Unassigned'} • ${_formatDate(trip['created_at'])}'),
                          ],
                        ),
                        trailing: _getStatusChip(trip['status']),
                        onTap: () => _showTripDetail(trip),
                      ),
                    );
                  },
                ),
    );
  }

  Color _getStatusColor(String? status) {
    switch (status) {
      case 'assigned': return Colors.blue;
      case 'driver_en_route': return Colors.orange;
      case 'driver_arrived': return Colors.purple;
      case 'in_progress': return Colors.green;
      case 'completed': return Colors.teal;
      case 'cancelled': return Colors.red;
      default: return Colors.grey;
    }
  }
}