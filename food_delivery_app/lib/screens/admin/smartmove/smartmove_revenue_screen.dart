import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveRevenueScreen extends StatefulWidget {
  const SmartMoveRevenueScreen({super.key});

  @override
  State<SmartMoveRevenueScreen> createState() => _SmartMoveRevenueScreenState();
}

class _SmartMoveRevenueScreenState extends State<SmartMoveRevenueScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  String _selectedPeriod = '7d';
  
  int _totalRides = 0;
  double _totalRevenue = 0;
  double _platformRevenue = 0;
  double _driverEarnings = 0;
  
  Map<String, int> _ridesByStatus = {};
  Map<String, double> _revenueByDay = {};
  Map<String, double> _revenueByDriver = {};
  List<Map<String, dynamic>> _recentRides = [];

  @override
  void initState() {
    super.initState();
    _loadRevenueData();
  }

  Future<void> _loadRevenueData() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      final now = DateTime.now();
      DateTime startDate;
      
      switch (_selectedPeriod) {
        case '24h':
          startDate = now.subtract(const Duration(hours: 24));
          break;
        case '7d':
          startDate = now.subtract(const Duration(days: 7));
          break;
        case '30d':
          startDate = now.subtract(const Duration(days: 30));
          break;
        default:
          startDate = now.subtract(const Duration(days: 7));
      }

      final response = await client.from('rides').select('''
        *,
        driver:driver_profiles!rides_driver_id_fkey(full_name)
      ''').gte('created_at', startDate.toIso8601String());

      final rides = List<Map<String, dynamic>>.from(response.data ?? []);
      
      double totalRevenue = 0;
      double platformRevenue = 0;
      double driverEarnings = 0;
      Map<String, int> ridesByStatus = {};
      Map<String, double> revenueByDay = {};
      Map<String, double> revenueByDriver = {};

      for (final ride in rides) {
        final fare = (ride['total_fare'] as num?)?.toDouble() ?? 0;
        final commission = (ride['platform_fee'] as num?)?.toDouble() ?? (fare * 0.15);
        final driverEarn = fare - commission;
        
        totalRevenue += fare;
        platformRevenue += commission;
        driverEarnings += driverEarn;
        
        final status = ride['status'] ?? 'pending';
        ridesByStatus[status] = (ridesByStatus[status] ?? 0) + 1;
        
        final createdAt = DateTime.tryParse(ride['created_at'] ?? '');
        if (createdAt != null) {
          final dayKey = '${createdAt.month}/${createdAt.day}';
          revenueByDay[dayKey] = (revenueByDay[dayKey] ?? 0) + fare;
        }
        
        final driverName = ride['driver']?['full_name'] ?? 'Unknown';
        revenueByDriver[driverName] = (revenueByDriver[driverName] ?? 0) + fare;
      }

      // Get recent completed rides
      final recentRides = rides.where((r) => r['status'] == 'completed')
          .toList()
        ..sort((a, b) => DateTime.parse(b['created_at'] ?? '').compareTo(DateTime.parse(a['created_at'] ?? '')));
      
      if (mounted) {
        setState(() {
          _totalRides = rides.length;
          _totalRevenue = totalRevenue;
          _platformRevenue = platformRevenue;
          _driverEarnings = driverEarnings;
          _ridesByStatus = ridesByStatus;
          _revenueByDay = revenueByDay;
          _revenueByDriver = revenueByDriver;
          _recentRides = recentRides.take(10).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading revenue data: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Revenue Analytics'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          DropdownButton<String>(
            value: _selectedPeriod,
            dropdownColor: Colors.white,
            underline: const SizedBox(),
            items: ['24h', '7d', '30d'].map((p) => DropdownMenuItem(value: p, child: Text(p))).toList(),
            onChanged: (value) {
              _selectedPeriod = value!;
              _loadRevenueData();
            },
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadRevenueData),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadRevenueData,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Summary Cards
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      childAspectRatio: 1.5,
                      children: [
                        _StatCard(title: 'Total Rides', value: _totalRides.toString(), icon: Icons.local_taxi, color: Colors.blue),
                        _StatCard(title: 'Total Revenue', value: 'TZS ${_formatNumber(_totalRevenue)}', icon: Icons.attach_money, color: Colors.green),
                        _StatCard(title: 'Platform Revenue', value: 'TZS ${_formatNumber(_platformRevenue)}', icon: Icons.account_balance, color: Colors.purple),
                        _StatCard(title: 'Driver Earnings', value: 'TZS ${_formatNumber(_driverEarnings)}', icon: Icons.people, color: Colors.orange),
                      ],
                    ),
                    const SizedBox(height: 24),
                    
                    // Revenue Trend Chart
                    _buildLineChart('Revenue Trend', _revenueByDay, Colors.green),
                    const SizedBox(height: 16),
                    
                    // Rides by Status
                    _buildPieChart('Rides by Status', _ridesByStatus),
                    const SizedBox(height: 16),
                    
                    // Top Drivers by Revenue
                    _buildTopDriversList(),
                    const SizedBox(height: 16),
                    
                    // Recent Rides
                    _buildRecentRides(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildLineChart(String title, Map<String, double> data, Color color) {
    final sortedKeys = data.keys.toList()..sort((a, b) {
      final aParts = a.split('/');
      final bParts = b.split('/');
      return (int.parse(aParts[0]) * 100 + int.parse(aParts[1])).compareTo(int.parse(bParts[0]) * 100 + int.parse(bParts[1]));
    });
    
    final spots = sortedKeys.asMap().entries.map((e) => FlSpot(e.key.toDouble(), data[e.value]!)).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 250,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(show: true, drawVerticalLine: false),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 80)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          return value.toInt() < sortedKeys.length
                              ? Padding(padding: const EdgeInsets.only(top: 8), child: Text(sortedKeys[value.toInt()], style: const TextStyle(fontSize: 8)))
                              : const Text('');
                        },
                      ),
                    ),
                    rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  lineBarsData: [
                    LineChartBarData(
                      spots: spots,
                      isCurved: true,
                      color: color,
                      barWidth: 3,
                      dotData: FlDotData(show: true),
                      belowBarData: BarAreaData(show: true, color: color.withOpacity(0.1)),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPieChart(String title, Map<String, int> data) {
    if (data.isEmpty) return const SizedBox.shrink();
    
    final colors = [Colors.amber, Colors.purple, Colors.green, Colors.blue, Colors.red, Colors.grey];
    final sections = data.entries.toList().asMap().entries.map((e) {
      return PieChartSectionData(
        value: e.value.value.toDouble(),
        title: '${e.value.key}\n${e.value.value}',
        color: colors[e.key % colors.length],
        radius: 80,
        titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
      );
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 250,
              child: PieChart(PieChartData(sections: sections, centerSpaceRadius: 40, sectionsSpace: 2)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopDriversList() {
    final sortedDrivers = _revenueByDriver.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    final top5 = sortedDrivers.take(5).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Top Drivers by Revenue', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (top5.isEmpty)
              const Text('No driver data', style: TextStyle(color: Colors.grey))
            else
              Column(
                children: top5.asMap().entries.map((e) {
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                      child: Text('${e.key + 1}', style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
                    ),
                    title: Text(e.value.key),
                    trailing: Text('TZS ${_formatNumber(e.value.value)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildRecentRides() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Recent Completed Rides', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (_recentRides.isEmpty)
              const Text('No recent rides', style: TextStyle(color: Colors.grey))
            else
              Column(
                children: _recentRides.map((ride) {
                  final driver = ride['driver']?['full_name'] ?? 'N/A';
                  final fare = (ride['total_fare'] as num?)?.toDouble() ?? 0;
                  return ListTile(
                    leading: CircleAvatar(
                      backgroundColor: Colors.green.withOpacity(0.1),
                      child: const Icon(Icons.check_circle, color: Colors.green, size: 20),
                    ),
                    title: Text('#${ride['id'].toString().substring(0, 8)}'),
                    subtitle: Text('Driver: $driver'),
                    trailing: Text('TZS ${_formatNumber(fare)}', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.green)),
                  );
                }).toList(),
              ),
          ],
        ),
      ),
    );
  }

  String _formatNumber(double num) {
    if (num >= 1000000) return '${(num / 1000000).toStringAsFixed(1)}M';
    if (num >= 1000) return '${(num / 1000).toStringAsFixed(1)}K';
    return num.toStringAsFixed(0);
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({required this.title, required this.value, required this.icon, required this.color});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(10)),
                  child: Icon(icon, color: color, size: 20),
                ),
                const Spacer(),
              ],
            ),
            const Spacer(),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
            Text(title, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }
}