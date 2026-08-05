import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:fl_chart/fl_chart.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class SmartMoveHeatmapsScreen extends StatefulWidget {
  const SmartMoveHeatmapsScreen({super.key});

  @override
  State<SmartMoveHeatmapsScreen> createState() => _SmartMoveHeatmapsScreenState();
}

class _SmartMoveHeatmapsScreenState extends State<SmartMoveHeatmapsScreen> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  String _selectedPeriod = '7d';
  
  Map<String, int> _pickupHeatmap = {};
  Map<String, int> _dropoffHeatmap = {};
  Map<String, int> _demandByHour = {};
  Map<String, int> _demandByDay = {};

  @override
  void initState() {
    super.initState();
    _loadHeatmapData();
  }

  Future<void> _loadHeatmapData() async {
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

      final response = await client.from('rides').select('pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, created_at').gte('created_at', startDate.toIso8601String());

      final rides = List<Map<String, dynamic>>.from(response.data ?? []);
      
      Map<String, int> pickupMap = {};
      Map<String, int> dropoffMap = {};
      Map<String, int> hourMap = {};
      Map<String, int> dayMap = {};

      for (final ride in rides) {
        final pickupLat = (ride['pickup_lat'] as num?)?.toDouble();
        final pickupLng = (ride['pickup_lng'] as num?)?.toDouble();
        final dropoffLat = (ride['dropoff_lat'] as num?)?.toDouble();
        final dropoffLng = (ride['dropoff_lng'] as num?)?.toDouble();
        
        if (pickupLat != null && pickupLng != null) {
          final key = _gridKey(pickupLat, pickupLng);
          pickupMap[key] = (pickupMap[key] ?? 0) + 1;
        }
        
        if (dropoffLat != null && dropoffLng != null) {
          final key = _gridKey(dropoffLat, dropoffLng);
          dropoffMap[key] = (dropoffMap[key] ?? 0) + 1;
        }
        
        final createdAt = DateTime.tryParse(ride['created_at'] ?? '');
        if (createdAt != null) {
          hourMap['${createdAt.hour}:00'] = (hourMap['${createdAt.hour}:00'] ?? 0) + 1;
          final dayKey = '${createdAt.month}/${createdAt.day}';
          dayMap[dayKey] = (dayMap[dayKey] ?? 0) + 1;
        }
      }

      if (mounted) {
        setState(() {
          _pickupHeatmap = pickupMap;
          _dropoffHeatmap = dropoffMap;
          _demandByHour = hourMap;
          _demandByDay = dayMap;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading heatmap data: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  String _gridKey(double lat, double lng) {
    // Simple grid: round to ~1km squares
    final gridLat = (lat * 100).floor() / 100;
    final gridLng = (lng * 100).floor() / 100;
    return '$gridLat,$gridLng';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Demand Heatmaps'),
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
              _loadHeatmapData();
            },
          ),
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadHeatmapData),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Pickup Heatmap
                  _buildHeatmapCard('Pickup Demand', _pickupHeatmap, Colors.blue),
                  const SizedBox(height: 16),
                  
                  // Dropoff Heatmap
                  _buildHeatmapCard('Dropoff Demand', _dropoffHeatmap, Colors.red),
                  const SizedBox(height: 24),
                  
                  // Demand by Hour
                  _buildBarChart('Demand by Hour', _demandByHour, Colors.purple),
                  const SizedBox(height: 16),
                  
                  // Demand by Day
                  _buildBarChart('Demand by Day', _demandByDay, Colors.teal),
                ],
              ),
            ),
    );
  }

  Widget _buildHeatmapCard(String title, Map<String, int> data, Color color) {
    final maxCount = data.values.isEmpty ? 1 : data.values.reduce((a, b) => a > b ? a : b);
    
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            if (data.isEmpty)
              const Center(child: Padding(padding: EdgeInsets.all(32), child: Text('No location data available')))
            else
              SizedBox(
                height: 300,
                child: LayoutBuilder(
                  builder: (context, constraints) {
                    final gridSize = 20;
                    final cellWidth = constraints.maxWidth / gridSize;
                    final cellHeight = 300 / gridSize;
                    
                    return CustomPaint(
                      size: Size(constraints.maxWidth, 300),
                      painter: _HeatmapPainter(
                        data: data,
                        maxCount: maxCount,
                        gridSize: gridSize,
                        color: color,
                      ),
                    );
                  },
                ),
              ),
            const SizedBox(height: 16),
            Row(
              children: [
                _buildLegend(color, maxCount),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLegend(Color color, int maxCount) {
    return Row(
      children: [
        const Text('Low '),
        ...List.generate(5, (i) {
          final opacity = 0.2 + (i * 0.16);
          return Container(
            width: 20,
            height: 20,
            margin: const EdgeInsets.symmetric(horizontal: 2),
            color: color.withOpacity(opacity),
          );
        }),
        const Text(' High'),
      ],
    );
  }

  Widget _buildBarChart(String title, Map<String, int> data, Color color) {
    if (data.isEmpty) return const SizedBox.shrink();
    
    final sorted = data.entries.toList()..sort((a, b) {
      // Sort by hour or day
      final aVal = int.tryParse(a.key.split(':')[0].split('/')[0]) ?? 0;
      final bVal = int.tryParse(b.key.split(':')[0].split('/')[0]) ?? 0;
      return aVal.compareTo(bVal);
    });

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
              child: BarChart(
                BarChartData(
                  gridData: FlGridData(show: false),
                  titlesData: FlTitlesData(
                    leftTitles: AxisTitles(sideTitles: SideTitles(showTitles: true, reservedSize: 40)),
                    bottomTitles: AxisTitles(
                      sideTitles: SideTitles(
                        showTitles: true,
                        getTitlesWidget: (value, meta) {
                          return value.toInt() < sorted.length
                              ? Padding(padding: const EdgeInsets.only(top: 8), child: Text(sorted[value.toInt()].key, style: const TextStyle(fontSize: 8)))
                              : const Text('');
                        },
                      ),
                    ),
                    rightTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                    topTitles: AxisTitles(sideTitles: SideTitles(showTitles: false)),
                  ),
                  borderData: FlBorderData(show: false),
                  barGroups: sorted.asMap().entries.map((e) {
                    return BarChartGroupData(
                      x: e.key,
                      barRods: [
                        BarChartRodData(
                          toY: e.value.value.toDouble(),
                          color: color,
                          width: 16,
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
}

class _HeatmapPainter extends CustomPainter {
  final Map<String, int> data;
  final int maxCount;
  final int gridSize;
  final Color color;

  _HeatmapPainter({required this.data, required this.maxCount, required this.gridSize, required this.color});

  @override
  void paint(Canvas canvas, Size size) {
    final cellWidth = size.width / gridSize;
    final cellHeight = size.height / gridSize;

    // Parse grid coordinates
    for (final entry in data.entries) {
      final coords = entry.key.split(',');
      if (coords.length != 2) continue;
      
      final lat = double.tryParse(coords[0]);
      final lng = double.tryParse(coords[1]);
      if (lat == null || lng == null) continue;

      // Map lat/lng to grid (simplified - in reality you'd use proper map projection)
      // This is a simplified visualization
      final x = ((lng + 180) / 360 * gridSize).clamp(0, gridSize - 1).toInt();
      final y = ((90 - lat) / 180 * gridSize).clamp(0, gridSize - 1).toInt();
      
      if (x >= 0 && x < gridSize && y >= 0 && y < gridSize) {
        final opacity = 0.2 + (entry.value / maxCount * 0.8);
        final paint = Paint()..color = color.withOpacity(opacity);
        canvas.drawRect(
          Rect.fromLTWH(x * cellWidth, y * cellHeight, cellWidth, cellHeight),
          paint,
        );
      }
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}