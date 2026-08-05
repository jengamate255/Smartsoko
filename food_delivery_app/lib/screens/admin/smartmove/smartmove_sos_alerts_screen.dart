import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveSOSAlertsScreen extends StatefulWidget {
  const SmartMoveSOSAlertsScreen({super.key});

  @override
  State<SmartMoveSOSAlertsScreen> createState() => _SmartMoveSOSAlertsScreenState();
}

class _SmartMoveSOSAlertsScreenState extends State<SmartMoveSOSAlertsScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _alerts = [];
  String _statusFilter = 'all';
  Stream? _alertsStream;

  @override
  void initState() {
    super.initState();
    _loadAlerts();
    _startRealtimeSubscription();
  }

  @override
  void dispose() {
    _alertsStream?.cancel();
    super.dispose();
  }

  Future<void> _loadAlerts() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      var query = client.from('sos_events').select('''
        *,
        user:profiles!sos_events_user_id_fkey(full_name, phone),
        responder:profiles!sos_events_resolved_by_fkey(full_name)
      ''').order('created_at', ascending: false);

      if (_statusFilter != 'all') {
        query = query.eq('status', _statusFilter);
      }

      final response = await query;
      if (mounted) {
        setState(() {
          _alerts = List<Map<String, dynamic>>.from(response.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading SOS alerts: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _startRealtimeSubscription() {
    try {
      final client = _supabaseService.client;
      _alertsStream = client.from('sos_events').stream(primaryKey: ['id']).listen((_) {
        if (mounted) _loadAlerts();
      });
    } catch (_) {}
  }

  Future<void> _updateAlertStatus(String alertId, String status) async {
    try {
      final client = _supabaseService.client;
      await client.from('sos_events').update({
        'status': status,
        if (status == 'resolved' || status == 'acknowledged') ...{
          'resolved_by': (await client.auth.currentSession()?.user?.id),
          'resolved_at': DateTime.now().toIso8601String(),
        },
      }).eq('id', alertId);
      _loadAlerts();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Alert $status'), backgroundColor: Colors.green),
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

  void _showAlertDetail(Map<String, dynamic> alert) {
    final user = alert['user'] as Map<String, dynamic>?;
    final responder = alert['responder'] as Map<String, dynamic>?;
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Row(
          children: [
            Icon(Icons.sos, color: Colors.red[700], size: 28),
            const SizedBox(width: 8),
            Expanded(child: Text('SOS Alert #${alert['id'].toString().substring(0, 8)}')),
          ],
        ),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              _infoRow('Status', _statusChip(alert['status'])),
              _infoRow('User', Text(user?['full_name'] ?? 'N/A', style: const TextStyle(fontWeight: FontWeight.bold))),
              _infoRow('Phone', Text(user?['phone'] ?? 'N/A')),
              _infoRow('Trigger', Text(alert['trigger_type'] ?? 'manual')),
              _infoRow('Location', Text('${alert['latitude']}, ${alert['longitude']}')),
              _infoRow('Address', Text(alert['address'] ?? 'N/A')),
              _infoRow('Ride ID', Text(alert['ride_id']?.toString().substring(0, 8) ?? 'N/A')),
              _infoRow('Time', Text(_formatDate(alert['created_at']))),
              if (alert['response_time_seconds'] != null)
                _infoRow('Response Time', Text('${alert['response_time_seconds']}s')),
              if (responder != null)
                _infoRow('Resolved By', Text(responder['full_name'] ?? 'N/A')),
              if (alert['notes'] != null && alert['notes'].toString().isNotEmpty)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text('Notes: ${alert['notes']}', style: const TextStyle(fontStyle: FontStyle.italic)),
                ),
            ],
          ),
        ),
        actions: [
          if (alert['status'] == 'active')
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _updateAlertStatus(alert['id'], 'acknowledged');
              },
              child: const Text('Acknowledge', style: TextStyle(color: Colors.orange)),
            ),
          if (['active', 'acknowledged'].contains(alert['status']))
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _updateAlertStatus(alert['id'], 'resolved');
              },
              child: const Text('Resolve', style: TextStyle(color: Colors.green)),
            ),
          if (alert['status'] == 'active')
            TextButton(
              onPressed: () {
                Navigator.pop(context);
                _updateAlertStatus(alert['id'], 'false_alarm');
              },
              child: const Text('False Alarm', style: TextStyle(color: Colors.grey)),
            ),
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }

  Widget _infoRow(String label, Widget value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(width: 110, child: Text(label, style: const TextStyle(fontWeight: FontWeight.w500, color: Colors.grey))),
          Expanded(child: value),
        ],
      ),
    );
  }

  Widget _statusChip(String? status) {
    Color color;
    String label;
    switch (status) {
      case 'active': color = Colors.red; label = 'ACTIVE'; break;
      case 'acknowledged': color = Colors.orange; label = 'ACKNOWLEDGED'; break;
      case 'resolved': color = Colors.green; label = 'RESOLVED'; break;
      case 'false_alarm': color = Colors.grey; label = 'FALSE ALARM'; break;
      default: color = Colors.grey; label = status?.toUpperCase() ?? 'UNKNOWN';
    }
    return Chip(
      label: Text(label, style: const TextStyle(fontSize: 11)),
      backgroundColor: color.withOpacity(0.1),
      labelStyle: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 11),
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
        title: const Text('SOS Alerts'),
        backgroundColor: Colors.red[700],
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadAlerts)],
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            color: Colors.grey[50],
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: ['all', 'active', 'acknowledged', 'resolved', 'false_alarm'].map((s) {
                  final isSelected = _statusFilter == s;
                  return Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: FilterChip(
                      label: Text(s.replaceAll('_', ' ').toUpperCase()),
                      selected: isSelected,
                      onSelected: (val) {
                        _statusFilter = s;
                        _loadAlerts();
                      },
                      selectedColor: s == 'active' ? Colors.red[100] : Colors.blue[100],
                    ),
                  );
                }).toList(),
              ),
            ),
          ),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _alerts.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.check_circle, size: 64, color: Colors.grey[400]),
                            const SizedBox(height: 16),
                            Text('No SOS alerts', style: TextStyle(fontSize: 18, color: Colors.grey[600])),
                          ],
                        ),
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: _alerts.length,
                        itemBuilder: (context, index) {
                          final alert = _alerts[index];
                          final user = alert['user'] as Map<String, dynamic>?;
                          final isActive = alert['status'] == 'active';
                          return Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                              side: isActive ? BorderSide(color: Colors.red[300]!, width: 1.5) : BorderSide.none,
                            ),
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: isActive ? Colors.red[100] : Colors.grey[200],
                                child: Icon(Icons.sos, color: isActive ? Colors.red[700] : Colors.grey[600]),
                              ),
                              title: Row(
                                children: [
                                  Expanded(
                                    child: Text(user?['full_name'] ?? 'Unknown',
                                        style: const TextStyle(fontWeight: FontWeight.bold)),
                                  ),
                                  if (isActive)
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                      decoration: BoxDecoration(
                                        color: Colors.red[100],
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: const Text('LIVE', style: TextStyle(color: Colors.red, fontSize: 10, fontWeight: FontWeight.bold)),
                                    ),
                                ],
                              ),
                              subtitle: Text('${alert['trigger_type'] ?? 'manual'} • ${_formatDate(alert['created_at'])}'),
                              trailing: _statusChip(alert['status']),
                              onTap: () => _showAlertDetail(alert),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }
}
