import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveDriverAnalyticsScreen extends StatefulWidget {
  const SmartMoveDriverAnalyticsScreen({super.key});

  @override
  State<SmartMoveDriverAnalyticsScreen> createState() => _SmartMoveDriverAnalyticsScreenState();
}

class _SmartMoveDriverAnalyticsScreenState extends State<SmartMoveDriverAnalyticsScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  String _period = 'weekly';

  int _totalDrivers = 0;
  int _onlineDrivers = 0;
  int _pendingVerifications = 0;
  int _suspendedDrivers = 0;
  double _avgRating = 0;
  double _avgAcceptanceRate = 0;
  double _avgCancellationRate = 0;
  int _totalCompletedRides = 0;

  List<Map<String, dynamic>> _topDrivers = [];
  List<Map<String, dynamic>> _earningsData = [];

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
  }

  Future<void> _loadAnalytics() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;

      final drivers = await client.from('driver_profiles').select('status, is_online, rating, total_ratings, acceptance_rate, cancellation_rate, completed_rides');
      final driverList = List<Map<String, dynamic>>.from(drivers.data ?? []);
      _totalDrivers = driverList.length;
      _onlineDrivers = driverList.where((d) => d['is_online'] == true).length;
      _pendingVerifications = driverList.where((d) => d['status'] == 'pending').length;
      _suspendedDrivers = driverList.where((d) => d['status'] == 'suspended').length;

      final rated = driverList.where((d) => d['total_ratings'] != null && (d['total_ratings'] as int) > 0).toList();
      _avgRating = rated.isEmpty ? 0 : rated.fold(0.0, (sum, d) => sum + (d['rating'] ?? 5.0).toDouble()) / rated.length;

      _avgAcceptanceRate = driverList.isEmpty ? 0 : driverList.fold(0.0, (s, d) => s + (d['acceptance_rate'] ?? 100).toDouble()) / driverList.length;
      _avgCancellationRate = driverList.isEmpty ? 0 : driverList.fold(0.0, (s, d) => s + (d['cancellation_rate'] ?? 0).toDouble()) / driverList.length;
      _totalCompletedRides = driverList.fold(0, (s, d) => s + (d['completed_rides'] ?? 0));

      final top = await client.from('driver_profiles').select('''
        full_name, vehicle_type, vehicle_plate, rating, total_ratings, completed_rides, is_online
      ''').order('completed_rides', ascending: false).limit(20);
      _topDrivers = List<Map<String, dynamic>>.from(top.data ?? []);

      final now = DateTime.now();
      DateTime start;
      if (_period == 'daily') { start = now.subtract(const Duration(days: 30)); }
      else if (_period == 'weekly') { start = now.subtract(const Duration(days: 90)); }
      else { start = now.subtract(const Duration(days: 365)); }

      final earnings = await client.from('driver_earnings_summary').select('*')
          .eq('period_type', _period == 'daily' ? 'daily' : _period == 'weekly' ? 'weekly' : 'monthly')
          .gte('period_start', start.toIso8601String().substring(0, 10))
          .order('period_start', ascending: true);
      _earningsData = List<Map<String, dynamic>>.from(earnings.data ?? []);

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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Driver Analytics'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadAnalytics)],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadAnalytics,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(children: [
                      _statCard('Total', _totalDrivers.toString(), Icons.people, Colors.blue),
                      const SizedBox(width: 8),
                      _statCard('Online', _onlineDrivers.toString(), Icons.person_pin, Colors.green),
                    ]),
                    const SizedBox(height: 8),
                    Row(children: [
                      _statCard('Pending', _pendingVerifications.toString(), Icons.pending, Colors.orange),
                      const SizedBox(width: 8),
                      _statCard('Suspended', _suspendedDrivers.toString(), Icons.block, Colors.red),
                    ]),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        boxShadow: [BoxShadow(color: Colors.grey[200]!, blurRadius: 4, offset: const Offset(0, 2))],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Driver Performance', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          Row(children: [
                            _metricItem('Avg Rating', _avgRating.toStringAsFixed(2), Icons.star, Colors.amber),
                            _metricItem('Acceptance', '${_avgAcceptanceRate.toStringAsFixed(1)}%', Icons.check_circle, Colors.green),
                          ]),
                          const SizedBox(height: 8),
                          Row(children: [
                            _metricItem('Cancellation', '${_avgCancellationRate.toStringAsFixed(1)}%', Icons.cancel, Colors.red),
                            _metricItem('Total Rides', _totalCompletedRides.toString(), Icons.directions_car, Colors.blue),
                          ]),
                        ],
                      ),
                    ),
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        const Text('Earnings', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const Spacer(),
                        SegmentedButton<String>(
                          segments: const [
                            ButtonSegment(value: 'daily', label: Text('Day')),
                            ButtonSegment(value: 'weekly', label: Text('Week')),
                            ButtonSegment(value: 'monthly', label: Text('Month')),
                          ],
                          selected: {_period},
                          onSelectionChanged: (v) { _period = v.first; _loadAnalytics(); },
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    SizedBox(
                      height: 200,
                      child: _earningsData.isEmpty
                          ? const Center(child: Text('No earnings data', style: TextStyle(color: Colors.grey)))
                          : BarChart(
                              BarChartData(
                                alignment: BarChartAlignment.spaceAround,
                                maxY: (_earningsData.map((e) => (e['net_earnings'] ?? 0) as int).reduce((a, b) => a > b ? a : b) * 1.2).toDouble(),
                                barGroups: _earningsData.asMap().entries.map((e) => BarChartGroupData(
                                  x: e.key,
                                  barRods: [
                                    BarChartRodData(
                                      toY: (e.value['net_earnings'] ?? 0).toDouble(),
                                      color: Colors.green,
                                      width: 16,
                                      borderRadius: const BorderRadius.vertical(top: Radius.circular(4)),
                                    ),
                                  ],
                                )).toList(),
                                titlesData: FlTitlesData(
                                  show: true,
                                  bottomTitles: AxisTitles(
                                    sideTitles: SideTitles(
                                      showTitles: true,
                                      getTitlesWidget: (value, meta) {
                                        final idx = value.toInt();
                                        if (idx < 0 || idx >= _earningsData.length) return const Text('');
                                        final ds = _earningsData[idx]['period_start'] ?? '';
                                        return Text(ds.toString().substring(5, 10), style: const TextStyle(fontSize: 9));
                                      },
                                      reservedSize: 20,
                                    ),
                                  ),
                                  leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                  topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                  rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                                ),
                                gridData: FlGridData(show: true, drawVerticalLine: false),
                                borderData: FlBorderData(show: false),
                              ),
                            ),
                    ),
                    const SizedBox(height: 24),
                    Row(
                      children: [
                        const Text('Top Drivers', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                        const Spacer(),
                        Text('By completed rides', style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                      ],
                    ),
                    const SizedBox(height: 12),
                    ..._topDrivers.take(10).asMap().entries.map((entry) {
                      final i = entry.key + 1;
                      final d = entry.value;
                      return Card(
                        margin: const EdgeInsets.only(bottom: 6),
                        child: ListTile(
                          dense: true,
                          leading: CircleAvatar(
                            backgroundColor: i <= 3 ? Colors.amber[100] : Colors.grey[200],
                            child: Text('$i', style: TextStyle(fontWeight: FontWeight.bold, color: i <= 3 ? Colors.amber[800] : Colors.grey[600])),
                          ),
                          title: Text(d['full_name'] ?? 'Unknown', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 14)),
                          subtitle: Text('${d['vehicle_type'] ?? ''} • ${d['completed_rides'] ?? 0} rides', style: const TextStyle(fontSize: 12)),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.star, size: 16, color: Colors.amber[600]),
                              Text(' ${d['rating']?.toStringAsFixed(1) ?? '5.0'}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              if (d['is_online'] == true) ...[
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(color: Colors.green[100], borderRadius: BorderRadius.circular(8)),
                                  child: const Text('ONLINE', style: TextStyle(color: Colors.green, fontSize: 9, fontWeight: FontWeight.bold)),
                                ),
                              ],
                            ],
                          ),
                        ),
                      );
                    }),
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
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [Icon(icon, color: color, size: 24), const Spacer(), Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color))]),
              Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 13)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _metricItem(String label, String value, IconData icon, Color color) {
    return Expanded(
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 4),
              Text(value, style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: color)),
            ],
          ),
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey[600])),
        ],
      ),
    );
  }
}
