import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:csv/csv.dart';
import '../../models/shop.dart';
import '../../services/sme_service.dart';
import '../../services/analytics_service.dart';
import 'sme_inventory_screen.dart';
import 'sme_staff_screen.dart';
import 'sme_promotions_screen.dart';
import 'sme_invoices_screen.dart';
import 'sme_branches_screen.dart';
import 'sme_customers_screen.dart';

class SMEDashboardScreen extends StatefulWidget {
  final Shop shop;

  const SMEDashboardScreen({super.key, required this.shop});

  @override
  State<SMEDashboardScreen> createState() => _SMEDashboardScreenState();
}

class _SMEDashboardScreenState extends State<SMEDashboardScreen> {
  final SMEService _smeService = SMEService();
  final AnalyticsService _analyticsService = AnalyticsService();

  bool _isLoading = true;
  Map<String, dynamic> _analytics = {};
  int _selectedPeriod = 7;

  @override
  void initState() {
    super.initState();
    _loadAnalytics();
    _logScreenView();
  }

  Future<void> _logScreenView() async {
    await _analyticsService.logScreenView(
      screenName: 'SMEDashboard',
      screenClass: 'SMEDashboardScreen',
    );
  }

  Future<void> _loadAnalytics() async {
    setState(() => _isLoading = true);
    try {
      final data = await _smeService.getShopAnalytics(
        widget.shop.id,
        days: _selectedPeriod,
      );
      if (mounted) {
        setState(() {
          _analytics = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          // Header
          SliverAppBar(
            expandedHeight: 120,
            floating: true,
            backgroundColor: Colors.orange,
            flexibleSpace: FlexibleSpaceBar(
              title: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.shop.name,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    widget.shop.category,
                    style: const TextStyle(fontSize: 12),
                  ),
                ],
              ),
            ),
            actions: [
              IconButton(
                icon: const Icon(Icons.download),
                onPressed: _exportSalesReport,
                tooltip: 'Export Sales Report',
              ),
              IconButton(
                icon: const Icon(Icons.refresh),
                onPressed: _loadAnalytics,
              ),
            ],
          ),

          // Content
          if (_isLoading)
            const SliverFillRemaining(
              child: Center(child: CircularProgressIndicator()),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  // Period selector
                  _buildPeriodSelector(),
                  const SizedBox(height: 16),

                  // Today's stats
                  _buildSectionTitle('Today'),
                  _buildTodayStats(),
                  const SizedBox(height: 24),

                  // Overview stats
                  _buildSectionTitle('Overview (${_selectedPeriod} days)'),
                  _buildOverviewStats(),
                  const SizedBox(height: 24),

                  // Quick actions grid
                  _buildSectionTitle('Quick Actions'),
                  _buildQuickActions(),
                  const SizedBox(height: 24),

                  // Top products
                  _buildSectionTitle('Top Products'),
                  _buildTopProducts(),
                  const SizedBox(height: 24),

                  // Low stock alerts
                  _buildSectionTitle('Low Stock Alerts'),
                  _buildLowStockAlerts(),
                  const SizedBox(height: 24),

                  // Revenue chart
                  _buildSectionTitle('Revenue Trend'),
                  _buildRevenueChart(),
                  const SizedBox(height: 16),
                ]),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildPeriodSelector() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          const Text('Period:', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          ...[
            {'label': '7D', 'days': 7},
            {'label': '30D', 'days': 30},
            {'label': '90D', 'days': 90},
          ].map((period) {
            final isSelected = _selectedPeriod == period['days'];
            return Padding(
              padding: const EdgeInsets.only(right: 8),
              child: ChoiceChip(
                label: Text(period['label'] as String),
                selected: isSelected,
                onSelected: (_) {
                  setState(() => _selectedPeriod = period['days'] as int);
                  _loadAnalytics();
                },
                selectedColor: Colors.orange[200],
              ),
            );
          }).toList(),
        ],
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Text(
        title,
        style: const TextStyle(
          fontSize: 18,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTodayStats() {
    final todayRevenue = (_analytics['todayRevenue'] as double?) ?? 0;
    final todayOrders = (_analytics['todayOrders'] as int?) ?? 0;

    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            icon: Icons.monetization_on,
            label: 'Today\'s Revenue',
            value: 'TSh ${todayRevenue.toStringAsFixed(0)}',
            color: Colors.green,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            icon: Icons.shopping_bag,
            label: 'Today\'s Orders',
            value: todayOrders.toString(),
            color: Colors.blue,
          ),
        ),
      ],
    );
  }

  Widget _buildOverviewStats() {
    final totalRevenue = (_analytics['totalRevenue'] as double?) ?? 0;
    final totalOrders = (_analytics['totalOrders'] as int?) ?? 0;
    final avgOrderValue = (_analytics['averageOrderValue'] as double?) ?? 0;
    final pendingOrders = (_analytics['pendingOrders'] as int?) ?? 0;

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1.5,
      children: [
        _buildStatCard(
          icon: Icons.trending_up,
          label: 'Total Revenue',
          value: 'TSh ${totalRevenue.toStringAsFixed(0)}',
          color: Colors.green,
        ),
        _buildStatCard(
          icon: Icons.receipt_long,
          label: 'Total Orders',
          value: totalOrders.toString(),
          color: Colors.blue,
        ),
        _buildStatCard(
          icon: Icons.calculate,
          label: 'Avg Order Value',
          value: 'TSh ${avgOrderValue.toStringAsFixed(0)}',
          color: Colors.purple,
        ),
        _buildStatCard(
          icon: Icons.pending,
          label: 'Pending',
          value: pendingOrders.toString(),
          color: pendingOrders > 0 ? Colors.orange : Colors.grey,
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required String label,
    required String value,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: color,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: color.withOpacity(0.8),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActions() {
    final actions = [
      {'icon': Icons.inventory_2, 'label': 'Inventory', 'color': Colors.blue, 'screen': 'inventory'},
      {'icon': Icons.people, 'label': 'Staff', 'color': Colors.purple, 'screen': 'staff'},
      {'icon': Icons.local_offer, 'label': 'Promotions', 'color': Colors.orange, 'screen': 'promotions'},
      {'icon': Icons.receipt, 'label': 'Invoices', 'color': Colors.green, 'screen': 'invoices'},
      {'icon': Icons.account_balance, 'label': 'Branches', 'color': Colors.teal, 'screen': 'branches'},
      {'icon': Icons.group, 'label': 'Customers', 'color': Colors.indigo, 'screen': 'customers'},
    ];

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 3,
      mainAxisSpacing: 12,
      crossAxisSpacing: 12,
      childAspectRatio: 1,
      children: actions.map((action) {
        return GestureDetector(
          onTap: () => _navigateToScreen(action['screen'] as String),
          child: Container(
            decoration: BoxDecoration(
              color: (action['color'] as Color).withOpacity(0.1),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: (action['color'] as Color).withOpacity(0.3)),
            ),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(
                  action['icon'] as IconData,
                  size: 32,
                  color: action['color'] as Color,
                ),
                const SizedBox(height: 8),
                Text(
                  action['label'] as String,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: action['color'] as Color,
                  ),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  void _navigateToScreen(String screen) {
    Widget? target;
    switch (screen) {
      case 'inventory':
        target = SMEInventoryScreen(shop: widget.shop);
        break;
      case 'staff':
        target = SMEStaffScreen(shop: widget.shop);
        break;
      case 'promotions':
        target = SMEPromotionsScreen(shop: widget.shop);
        break;
      case 'invoices':
        target = SMEInvoicesScreen(shop: widget.shop);
        break;
      case 'branches':
        target = SMEBranchesScreen(shop: widget.shop);
        break;
      case 'customers':
        target = SMECustomersScreen(shop: widget.shop);
        break;
    }
    if (target != null) {
      Navigator.push(
        context,
        MaterialPageRoute(builder: (context) => target!),
      );
    }
  }

  Widget _buildTopProducts() {
    final topProducts = (_analytics['topProducts'] as List?) ?? [];
    if (topProducts.isEmpty) {
      return _buildEmptyState(Icons.star_border, 'No sales data yet');
    }

    return Column(
      children: topProducts.take(5).map((item) {
        final product = item['product'] as Product;
        final quantity = item['quantity'] as int;
        return ListTile(
          leading: Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: Colors.orange[100],
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(Icons.inventory_2, color: Colors.orange[700]),
          ),
          title: Text(product.name),
          subtitle: Text('TSh ${product.price.toStringAsFixed(0)}'),
          trailing: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: Colors.orange[100],
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              '${quantity} sold',
              style: TextStyle(
                color: Colors.orange[800],
                fontWeight: FontWeight.bold,
                fontSize: 12,
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildLowStockAlerts() {
    final lowStockProducts = (_analytics['lowStockProducts'] as List?) ?? [];
    if (lowStockProducts.isEmpty) {
      return _buildEmptyState(Icons.check_circle, 'All products well stocked');
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.red[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.red[200]!),
      ),
      child: Column(
        children: lowStockProducts.map<Widget>((p) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 4),
            child: Row(
              children: [
                Icon(Icons.warning, color: Colors.red[700], size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    p.name,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.red[200],
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${p.stockQuantity} left',
                    style: TextStyle(
                      color: Colors.red[800],
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          );
        }).toList().cast<Widget>(),
      ),
    );
  }

  Widget _buildRevenueChart() {
    final dailyRevenue = (_analytics['dailyRevenue'] as List?) ?? [];
    if (dailyRevenue.isEmpty) {
      return _buildEmptyState(Icons.show_chart, 'No revenue data');
    }

    final maxRevenue = dailyRevenue.fold<double>(
      0,
      (max, day) => (day['revenue'] as double) > max ? day['revenue'] as double : max,
    );

    return Container(
      height: 150,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey[200]!),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: dailyRevenue.map((day) {
          final revenue = day['revenue'] as double;
          final height = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0.0;
          return Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 1),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  Container(
                    height: height,
                    decoration: BoxDecoration(
                      color: revenue > 0 ? Colors.orange : Colors.grey[300],
                      borderRadius: const BorderRadius.vertical(top: Radius.circular(2)),
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList().cast<Widget>(),
      ),
    );
  }

  Widget _buildEmptyState(IconData icon, String message) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, size: 48, color: Colors.grey[400]),
          const SizedBox(height: 8),
          Text(
            message,
            style: TextStyle(color: Colors.grey[600]),
          ),
        ],
      ),
    );
  }

  Future<void> _exportSalesReport() async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (context) => const Center(child: CircularProgressIndicator()),
      );

      final ordersSnapshot = await FirebaseFirestore.instance
          .collection('orders')
          .where('restaurantId', isEqualTo: widget.shop.id)
          .get();

      final csvRows = [
        ['Order ID', 'Date', 'Status', 'Total', 'Items', 'Customer Address', 'Driver']
      ];

      for (final doc in ordersSnapshot.docs) {
        final data = doc.data();
        final items = (data['items'] as List?)?.map((item) => '${item['quantity']}x ${item['name']}').join('; ') ?? '';
        csvRows.add([
          doc.id,
          data['createdAt']?.toString() ?? '',
          data['status'] ?? '',
          data['total']?.toString() ?? '0',
          items,
          data['deliveryAddress'] ?? '',
          data['driverName'] ?? 'Unassigned',
        ]);
      }

      final csv = const ListToCsvConverter().convert(csvRows);

      Navigator.pop(context);

      if (mounted) {
        showDialog(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Sales Report'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('${ordersSnapshot.docs.length} orders found'),
                const SizedBox(height: 12),
                const Text('CSV data copied to clipboard. Paste into a spreadsheet app.'),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
              ElevatedButton(
                onPressed: () {
                  Clipboard.setData(ClipboardData(text: csv));
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('CSV copied to clipboard!'), backgroundColor: Colors.green),
                  );
                  Navigator.pop(context);
                },
                child: const Text('Copy CSV'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error exporting report: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }
}
