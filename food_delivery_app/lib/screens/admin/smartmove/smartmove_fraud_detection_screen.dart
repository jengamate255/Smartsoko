import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveFraudDetectionScreen extends StatefulWidget {
  const SmartMoveFraudDetectionScreen({super.key});

  @override
  State<SmartMoveFraudDetectionScreen> createState() => _SmartMoveFraudDetectionScreenState();
}

class _SmartMoveFraudDetectionScreenState extends State<SmartMoveFraudDetectionScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  String _alertFilter = 'all';

  int _totalAlerts = 0;
  int _openAlerts = 0;
  int _highRiskRides = 0;
  int _flaggedDrivers = 0;

  List<Map<String, dynamic>> _flaggedRides = [];
  List<Map<String, dynamic>> _unusualPatterns = [];

  @override
  void initState() {
    super.initState();
    _loadFraudData();
  }

  Future<void> _loadFraudData() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;

      final allRides = await client.from('rides').select('''
        id, status, total_fare, distance_km, duration_minutes, created_at,
        customer:profiles!rides_customer_id_fkey(full_name),
        driver:driver_profiles!rides_driver_id_fkey(full_name, vehicle_plate)
      ''').order('created_at', ascending: false).limit(200);

      final rides = List<Map<String, dynamic>>.from(allRides.data ?? []);
      _totalAlerts = rides.length;

      List<Map<String, dynamic>> flagged = [];
      int highRisk = 0;
      int flaggedDrivers = 0;
      Set<String> flaggedDriverIds = {};

      for (final ride in rides) {
        double riskScore = 0;
        List<String> flags = [];

        final fare = (ride['total_fare'] ?? 0).toDouble();
        final distance = (ride['distance_km'] ?? 1).toDouble();
        final duration = (ride['duration_minutes'] ?? 1).toDouble();

        if (distance > 0 && fare / distance > 5000) {
          riskScore += 25;
          flags.add('High fare/km ratio');
        }

        if (duration > 0 && fare / duration > 2000) {
          riskScore += 20;
          flags.add('High fare/min ratio');
        }

        if (duration > 0 && distance / duration * 60 > 120) {
          riskScore += 15;
          flags.add('Unusual speed pattern');
        }

        if (ride['status'] == 'completed' && (fare == 0 || fare == null)) {
          riskScore += 10;
          flags.add('Zero fare ride');
        }

        if (flags.isNotEmpty) {
          ride['risk_score'] = riskScore;
          ride['flags'] = flags;
          flagged.add(ride);
          if (riskScore >= 30) highRisk++;
          final driver = ride['driver'] as Map<String, dynamic>?;
          if (driver != null) {
            flaggedDriverIds.add(driver['full_name'] ?? '');
          }
        }
      }

      _flaggedRides = flagged;
      _highRiskRides = highRisk;
      _openAlerts = flagged.where((r) => (r['risk_score'] ?? 0) >= 30).length;
      _flaggedDrivers = flaggedDriverIds.length;

      Map<String, int> patternCount = {};
      for (final ride in flagged) {
        final flags = ride['flags'] as List<String>? ?? [];
        for (final flag in flags) {
          patternCount[flag] = (patternCount[flag] ?? 0) + 1;
        }
      }
      _unusualPatterns = patternCount.entries
          .map((e) => {'pattern': e.key, 'count': e.value})
          .toList()
        ..sort((a, b) => (b['count'] as int).compareTo(a['count'] as int));

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

  @override
  Widget build(BuildContext context) {
    final filteredRides = _alertFilter == 'all'
        ? _flaggedRides
        : _alertFilter == 'high'
            ? _flaggedRides.where((r) => (r['risk_score'] ?? 0) >= 30).toList()
            : _flaggedRides.where((r) => (r['risk_score'] ?? 0) < 30).toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Fraud Detection'),
        backgroundColor: Colors.deepPurple[800],
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadFraudData)],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadFraudData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      _statCard('Flagged Rides', _flaggedRides.length.toString(), Icons.flag, Colors.deepOrange),
                      const SizedBox(width: 8),
                      _statCard('High Risk', _highRiskRides.toString(), Icons.warning, Colors.red),
                    ]),
                    const SizedBox(height: 8),
                    Row(children: [
                      _statCard('Flagged Drivers', _flaggedDrivers.toString(), Icons.person_off, Colors.purple),
                      const SizedBox(width: 8),
                      _statCard('Open Alerts', _openAlerts.toString(), Icons.notifications_active, Colors.amber),
                    ]),
                    const SizedBox(height: 16),
                    const Text('Fraud Patterns', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 200,
                      child: _unusualPatterns.isEmpty
                          ? const Center(child: Text('No patterns detected', style: TextStyle(color: Colors.grey)))
                          : PieChart(
                              PieChartData(
                                sections: _unusualPatterns.take(6).asMap().entries.map((e) {
                                  final colors = [Colors.red, Colors.orange, Colors.amber, Colors.blue, Colors.purple, Colors.teal];
                                  return PieChartSectionData(
                                    value: (e.value['count'] as int).toDouble(),
                                    title: '${e.value['count']}',
                                    color: colors[e.key % colors.length],
                                    radius: 50,
                                    titleStyle: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14),
                                  );
                                }).toList(),
                                sectionsSpace: 2,
                                centerSpaceRadius: 30,
                              ),
                            ),
                    ),
                    const SizedBox(height: 8),
                    Wrap(
                      spacing: 8,
                      runSpacing: 4,
                      children: _unusualPatterns.take(6).asMap().entries.map((e) {
                        final colors = [Colors.red, Colors.orange, Colors.amber, Colors.blue, Colors.purple, Colors.teal];
                        return Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Container(width: 10, height: 10, decoration: BoxDecoration(color: colors[e.key % colors.length], shape: BoxShape.circle)),
                            const SizedBox(width: 4),
                            Text('${e.value['pattern']} (${e.value['count']})', style: const TextStyle(fontSize: 11)),
                          ],
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Text('Flagged Rides', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const Spacer(),
                        SegmentedButton<String>(
                          segments: const [
                            ButtonSegment(value: 'all', label: Text('All')),
                            ButtonSegment(value: 'high', label: Text('High Risk')),
                            ButtonSegment(value: 'low', label: Text('Low Risk')),
                          ],
                          selected: {_alertFilter},
                          onSelectionChanged: (v) { setState(() { _alertFilter = v.first; }); },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ...filteredRides.map((ride) {
                      final customer = ride['customer'] as Map<String, dynamic>?;
                      final driver = ride['driver'] as Map<String, dynamic>?;
                      final riskScore = (ride['risk_score'] ?? 0).toDouble();
                      final flags = ride['flags'] as List<String>? ?? [];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(8),
                          side: riskScore >= 30 ? BorderSide(color: Colors.red[300]!, width: 1) : BorderSide.none,
                        ),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: riskScore >= 30 ? Colors.red[100] : Colors.orange[100],
                            child: Text('${riskScore.toInt()}', style: TextStyle(fontWeight: FontWeight.bold, color: riskScore >= 30 ? Colors.red : Colors.orange, fontSize: 12)),
                          ),
                          title: Row(
                            children: [
                              Expanded(child: Text('${customer?['full_name'] ?? 'Unknown'} → ${driver?['full_name'] ?? 'N/A'}', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13))),
                            ],
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('TZS ${ride['total_fare'] ?? 0} • ${ride['distance_km']?.toStringAsFixed(1) ?? '?'} km', style: const TextStyle(fontSize: 11)),
                              Wrap(
                                spacing: 4,
                                runSpacing: 2,
                                children: flags.map((f) => Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                                  decoration: BoxDecoration(color: Colors.red[50], borderRadius: BorderRadius.circular(4)),
                                  child: Text(f, style: const TextStyle(fontSize: 9, color: Colors.red)),
                                )).toList(),
                              ),
                            ],
                          ),
                          trailing: Text(_formatDate(ride['created_at']), style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        ),
                      );
                    }),
                    if (filteredRides.isEmpty)
                      const Padding(
                        padding: EdgeInsets.all(32),
                        child: Center(child: Text('No flagged rides found', style: TextStyle(color: Colors.grey))),
                      ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _statCard(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [Icon(icon, color: color, size: 24), const Spacer(), Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color))]),
              Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    try {
      return DateTime.parse(dateStr).toLocal().toString().substring(0, 16);
    } catch (_) {
      return dateStr;
    }
  }
}
