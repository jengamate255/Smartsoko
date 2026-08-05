import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveEmergencyScreen extends StatefulWidget {
  const SmartMoveEmergencyScreen({super.key});

  @override
  State<SmartMoveEmergencyScreen> createState() => _SmartMoveEmergencyScreenState();
}

class _SmartMoveEmergencyScreenState extends State<SmartMoveEmergencyScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;

  int _activeSosCount = 0;
  int _totalEmergencyContacts = 0;
  int _totalDrivers = 0;
  int _onlineDrivers = 0;
  int _activeRides = 0;
  List<Map<String, dynamic>> _recentSosEvents = [];
  List<Map<String, dynamic>> _driverLocations = [];

  @override
  void initState() {
    super.initState();
    _loadEmergencyData();
  }

  Future<void> _loadEmergencyData() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;

      final sosCount = await client.from('sos_events').select('id', count: CountOption.exact).eq('status', 'active');
      _activeSosCount = sosCount.count ?? 0;

      final contactsCount = await client.from('emergency_contacts').select('id', count: CountOption.exact);
      _totalEmergencyContacts = contactsCount.count ?? 0;

      final driversCount = await client.from('driver_profiles').select('id', count: CountOption.exact);
      _totalDrivers = driversCount.count ?? 0;

      final onlineCount = await client.from('driver_profiles').select('id', count: CountOption.exact).eq('is_online', true);
      _onlineDrivers = onlineCount.count ?? 0;

      final ridesCount = await client.from('rides').select('id', count: CountOption.exact)
          .inFilter('status', ['assigned', 'driver_en_route', 'driver_arrived', 'in_progress']);
      _activeRides = ridesCount.count ?? 0;

      final recentSos = await client.from('sos_events').select('''
        *,
        user:profiles!sos_events_user_id_fkey(full_name, phone)
      ''').order('created_at', ascending: false).limit(20);
      _recentSosEvents = List<Map<String, dynamic>>.from(recentSos.data ?? []);

      final locations = await client.from('driver_locations').select('''
        *,
        driver:driver_profiles!driver_locations_driver_id_fkey(full_name, vehicle_plate, vehicle_type)
      ''').eq('is_online', true).order('recorded_at', ascending: false).limit(50);
      _driverLocations = List<Map<String, dynamic>>.from(locations.data ?? []);

      if (mounted) setState(() => _isLoading = false);
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _broadcastAlert() async {
    final messageController = TextEditingController();
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Broadcast Emergency Alert'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Send an emergency broadcast to all active drivers:'),
            const SizedBox(height: 12),
            TextField(
              controller: messageController,
              decoration: const InputDecoration(
                hintText: 'Emergency message...',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, messageController.text),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('SEND', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (result != null && result.isNotEmpty) {
      try {
        final client = _supabaseService.client;
        final adminId = client.auth.currentSession()?.user?.id;
        await client.rpc('send_admin_notification', params: {
          'p_title': 'EMERGENCY: $result',
          'p_message': result,
          'p_type': 'emergency',
          'p_priority': 'urgent',
          'p_target_role': 'driver',
          'p_sent_by': adminId,
        });
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Emergency broadcast sent'), backgroundColor: Colors.green),
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
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Emergency Dashboard'),
        backgroundColor: Colors.orange[800],
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.campaign), onPressed: _broadcastAlert, tooltip: 'Broadcast Alert'),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadEmergencyData),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadEmergencyData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        _statCard('Active SOS', _activeSosCount.toString(), Icons.sos, Colors.red, () {}),
                        const SizedBox(width: 12),
                        _statCard('Online Drivers', _onlineDrivers.toString(), Icons.person_pin, Colors.green, () {}),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        _statCard('Active Rides', _activeRides.toString(), Icons.local_taxi, Colors.blue, () {}),
                        const SizedBox(width: 12),
                        _statCard('Emergency Contacts', _totalEmergencyContacts.toString(), Icons.contacts, Colors.purple, () {}),
                      ],
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        const Text('Recent SOS Events', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const Spacer(),
                        Text('${_activeSosCount} active', style: const TextStyle(color: Colors.red)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...(_recentSosEvents.take(10).map((event) {
                      final user = event['user'] as Map<String, dynamic>?;
                      final isActive = event['status'] == 'active';
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: isActive ? BorderSide(color: Colors.red[300]!, width: 1) : BorderSide.none,
                        ),
                        child: ListTile(
                          dense: true,
                          leading: CircleAvatar(
                            radius: 16,
                            backgroundColor: isActive ? Colors.red[100] : Colors.grey[200],
                            child: Icon(Icons.sos, size: 16, color: isActive ? Colors.red : Colors.grey),
                          ),
                          title: Text(user?['full_name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                          subtitle: Text('${event['trigger_type']} • ${event['status']}', style: const TextStyle(fontSize: 12)),
                          trailing: Text(_formatDate(event['created_at']), style: const TextStyle(fontSize: 11, color: Colors.grey)),
                        ),
                      );
                    })),
                    if (_recentSosEvents.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(child: Text('No recent SOS events', style: TextStyle(color: Colors.grey))),
                      ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        const Text('Online Drivers Map', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const Spacer(),
                        Text('${_driverLocations.length} online', style: const TextStyle(color: Colors.green)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    if (_driverLocations.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(16),
                        child: Center(child: Text('No online drivers', style: TextStyle(color: Colors.grey))),
                      )
                    else
                      ...(_driverLocations.map((loc) {
                        final driver = loc['driver'] as Map<String, dynamic>?;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 6),
                          child: ListTile(
                            dense: true,
                            leading: const CircleAvatar(
                              radius: 16,
                              child: Icon(Icons.person, size: 16),
                            ),
                            title: Text(driver?['full_name'] ?? 'Unknown', style: const TextStyle(fontSize: 14)),
                            subtitle: Text('${driver?['vehicle_type'] ?? ''} • ${driver?['vehicle_plate'] ?? ''}', style: const TextStyle(fontSize: 12)),
                            trailing: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text('${loc['latitude']?.toStringAsFixed(4)}, ${loc['longitude']?.toStringAsFixed(4)}',
                                    style: const TextStyle(fontSize: 10, color: Colors.grey)),
                                const SizedBox(width: 8),
                                const Icon(Icons.my_location, size: 16, color: Colors.green),
                              ],
                            ),
                          ),
                        );
                      })),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color, VoidCallback onTap) {
    return Expanded(
      child: Card(
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(icon, color: color, size: 28),
                    const Spacer(),
                    Text(value, style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: color)),
                  ],
                ),
                const SizedBox(height: 4),
                Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
              ],
            ),
          ),
        ),
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
}
