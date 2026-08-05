import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class AdminAnalyticsScreen extends StatefulWidget {
  const AdminAnalyticsScreen({super.key});

  @override
  State<AdminAnalyticsScreen> createState() => _AdminAnalyticsScreenState();
}

class _AdminAnalyticsScreenState extends State<AdminAnalyticsScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  List<Map<String, dynamic>> _orders = [];
  List<Map<String, dynamic>> _sellers = [];
  List<Map<String, dynamic>> _drivers = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;
      
      final [ordersRes, sellersRes, driversRes] = await Future.wait([
        client.from('orders').select('*, customer:profiles!orders_customer_id_fkey(name), merchant:profiles!orders_merchant_id_fkey(name)').order('created_at', ascending: false).limit(500),
        client.from('profiles').select().eq('role', 'merchant').limit(100),
        client.from('driver_profiles').select().limit(100),
      ]);

      if (mounted) {
        setState(() {
          _orders = List<Map<String, dynamic>>.from(ordersRes.data ?? []);
          _sellers = List<Map<String, dynamic>>.from(sellersRes.data ?? []);
          _drivers = List<Map<String, dynamic>>.from(driversRes.data ?? []);
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading data: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  Map<String, int> _getDailyOrders(int days) {
    final now = DateTime.now();
    final map = <String, int>{};
    for (int i = days - 1; i >= 0; i--) {
      final date = DateTime(now.year, now.month, now.day - i);
      final key = '${date.month}/${date.day}';
      map[key] = 0;
    }
    
    for (final order in _orders) {
      try {
        final created = DateTime.parse(order['created_at'] ?? '');
        final key = '${created.month}/${created.day}';
        if (map.containsKey(key)) map[key] = (map[key] ?? 0) + 1;
      } catch (_) {}
    }
    return map;
  }

  Map<String, int> _getOrdersByStatus() {
    final map = <String, int>{};
    for (final order in _orders) {
      final status = order['status'] ?? 'pending';
      map[status] = (map[status] ?? 0) + 1;
    }
    return map;
  }

  Map<String, double> _getRevenueByCategory() {
    final map = <String, double>{};
    for (final order in _orders) {
      final items = order['items'] as List<dynamic>? ?? [];
      for (final item in items) {
        final cat = item['category'] ?? 'Other';
        final price = (item['price'] as num?)?.toDouble() ?? 0;
        final qty = (item['quantity'] as num?)?.toInt() ?? 1;
        map[cat] = (map[cat] ?? 0) + (price * qty);
      }
    }
    return map;
  }

  Map<String, int> _getTopSellers(int limit) {
    final map = <String, int>{};
    for (final order in _orders) {
      final merchant = order['merchant'] as Map<String, dynamic>?;
      final name = merchant?['name'] ?? 'Unknown';
      final total = (order['total'] as num?)?.toInt() ?? 0;
      map[name] = (map[name] ?? 0) + total;
    }
    final sorted = map.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return Map.fromEntries(sortedEntries.take(limit));
  }

  Map<String, int> _getTopProducts(int limit) {
    final map = <String, int>{};
    for (final order in _orders) {
      final items = order['items'] as List<dynamic>? ?? [];
      for (final item in items) {
        final name = item['name'] ?? 'Unknown';
        final qty = (item['quantity'] as num?)?.toInt() ?? 1;
        map[name] = (map[name] ?? 0) + qty;
      }
    }
    final sorted = map.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    return Map.fromEntries(sorted.take(limit));
  }

  Map<String, int> _getUserGrowth(int days) {
    final now = DateTime.now();
    final map = <String, int>{};
    for (int i = days - 1; i >= 0; i--) {
      final date = DateTime(now.year, now.month, now.day - i);
      final key = '${date.month}/${date.day}';
      map[key] = 0;
    }
    // This would need user creation dates from profiles
    return map;
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final dailyOrders = _getDailyOrders(7);
    final ordersByStatus = _getOrdersByStatus();
    final revenueByCategory = _getRevenueByCategory();
    final topSellers = _getTopSellers(5);
    final topProducts = _getTopProducts(5);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Analytics'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [IconButton(icon: const Icon(Icons.refresh), onPressed: _loadData)],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Revenue & Orders Overview
            _buildStatCards(),
            const SizedBox(height: 24),
            
            // Charts Row 1
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(flex: 2, child: _buildDailyOrdersChart(dailyOrders)),
                const SizedBox(width: 16),
                Expanded(child: _buildOrdersStatusChart(ordersByStatus)),
              ],
            ),
            const SizedBox(height: 24),
            
            // Charts Row 2
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _buildRevenueCategoryChart(revenueByCategory)),
                const SizedBox(width: 16),
                Expanded(child: _buildUserGrowthChart()),
              ],
            ),
            const SizedBox(height: 24),
            
            // Top Lists
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: _buildTopSellersList(topSellers)),
                const SizedBox(width: 16),
                Expanded(child: _buildTopProductsList(topProducts)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCards() {
    final totalRevenue = _orders.fold<int>(0, (sum, o) => sum + ((o['total'] as num?)?.toInt() ?? 0));
    final totalOrders = _orders.length;
    final avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return Row(
      children: [
        Expanded(child: _StatCard(title: 'Total Orders', value: '$totalOrders', icon: Icons.shopping_cart, color: Colors.blue)),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(title: 'Total Revenue', value: 'TZS ${totalRevenue.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}', icon: Icons.payments, color: Colors.green)),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(title: 'Avg Order', value: 'TZS ${avgOrder.toStringAsFixed(0)}', icon: Icons.analytics, color: Colors.purple)),
        const SizedBox(width: 12),
        Expanded(child: _StatCard(title: 'Active Sellers', value: '${_sellers.where((s) => s['is_open'] == true).length}', icon: Icons.store, color: Colors.orange)),
      ],
    );
  }

  Widget _buildDailyOrdersChart(Map<String, int> data) {
    final spots = data.entries.toList().asMap().entries.map((e) {
      return FlSpot(e.key.toDouble(), e.value.value.toDouble());
    }).toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Daily Orders (7 Days)', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 250,
              child: LineChart(
                LineChartData(
                  gridData: FlGridData(show: true, drawVerticalLine: false),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          final keys = data.keys.toList();
                          return value.toInt() < keys.length
                              ? Padding(padding: const EdgeInsets.only(top: 8), child: Text(keys[value.toInt()], style: const TextStyle(fontSize: 10)))
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
                      color: AppTheme.primaryColor,
                      barWidth: 3,
                      dotData: FlDotData(show: true),
                      belowBarData: BarAreaData(show: true, color: AppTheme.primaryColor.withOpacity(0.1)),
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

  Widget _buildOrdersStatusChart(Map<String, int> data) {
    if (data.isEmpty) return const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No order data')));

    final colors = [Colors.amber, Colors.purple, Colors.green, Colors.blue, Colors.red, Colors.grey];
    final entries = data.entries.toList();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Orders by Status', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 250,
              child: PieChart(
                PieChartData(
                  sections: entries.asMap().entries.map((e) {
                    final entry = e.value;
                    return PieChartSectionData(
                      value: entry.value.toDouble(),
                      title: '${entry.key}\n${entry.value}',
                      color: colors[e.key % colors.length],
                      radius: 80,
                      titleStyle: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white),
                    );
                  }).toList(),
                  centerSpaceRadius: 40,
                  sectionsSpace: 2,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRevenueCategoryChart(Map<String, double> data) {
    if (data.isEmpty) return const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('No revenue data')));

    final sorted = data.entries.toList()..sort((a, b) => b.value.compareTo(a.value));
    final top5 = sorted.take(5).toList();
    final colors = [Colors.green, Colors.blue, Colors.orange, Colors.red, Colors.purple];

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Revenue by Category', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 250,
              child: BarChart(
                BarChartData(
                  gridData: FlGridData(show: false),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          return value.toInt() < top5.length
                              ? Padding(padding: const EdgeInsets.only(top: 8), child: Text(top5[value.toInt()].key, style: const TextStyle(fontSize: 9)))
                              : const Text('');
                        },
                      ),
                    ),
                    rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: top5.asMap().entries.map((e) {
                    return BarChartGroupData(
                      x: e.key,
                      barRods: [
                        BarChartRodData(
                          toY: e.value.value,
                          color: colors[e.key % colors.length],
                          width: 20,
                          borderRadius: BorderRadius.circular(4),
                        ),
                      ],
                    );
                  }).toList(),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildUserGrowthChart() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('User Growth', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            SizedBox(
              height: 250,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(Icons.people, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 16),
                    Text('User growth chart requires', style: TextStyle(color: Colors.grey[600])),
                    Text('user creation timestamps', style: TextStyle(color: Colors.grey[600])),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopSellersList(Map<String, int> data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Top Sellers', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (data.isEmpty)
              const Text('No seller data', style: TextStyle(color: Colors.grey))
            else
              Column(
                children: data.entries.map((e) => ListTile(
                  leading: CircleAvatar(
                    backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
                    child: Text('${e.key.length >= 2 ? e.key.substring(0, 2).toUpperCase() : '?'}', style: TextStyle(color: AppTheme.primaryColor, fontWeight: FontWeight.bold)),
                  ),
                  title: Text(e.key),
                  trailing: Text('TZS ${e.value.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}'),
                )).toList(),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildTopProductsList(Map<String, int> data) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Top Products', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            if (data.isEmpty)
              const Text('No product data', style: TextStyle(color: Colors.grey))
            else
              Column(
                children: data.entries.map((e) => ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.orange.withOpacity(0.1),
                    child: Text('${e.key.length >= 2 ? e.key.substring(0, 2).toUpperCase() : '?'}', style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold)),
                  ),
                  title: Text(e.key),
                  trailing: Text('${e.value} sold'),
                )).toList(),
              ),
          ],
        ),
      ),
    );
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
                Icon(icon, color: color, size: 24),
                const Spacer(),
              ],
            ),
            const SizedBox(height: 12),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
            const SizedBox(height: 4),
            Text(title, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }
}