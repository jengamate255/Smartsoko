import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../../models/shop.dart';
import '../../models/sme_models.dart';
import '../../services/sme_service.dart';
import '../../services/auth_service.dart';
import '../../services/restaurant_service.dart';

class MerchantCustomerInsightsScreen extends StatefulWidget {
  final String restaurantId;

  const MerchantCustomerInsightsScreen({super.key, required this.restaurantId});

  @override
  State<MerchantCustomerInsightsScreen> createState() =>
      _MerchantCustomerInsightsScreenState();
}

class _MerchantCustomerInsightsScreenState
    extends State<MerchantCustomerInsightsScreen> {
  final SMEService _smeService = SMEService();
  final AuthService _authService = AuthService();
  final RestaurantService _restaurantService = RestaurantService();
  final NumberFormat _currencyFormat = NumberFormat('#,##0', 'en_US');

  static const Color _primaryColor = Color(0xFF064E3B);
  static const Color _goldColor = Color(0xFFFFD700);
  static const Color _silverColor = Color(0xFFC0C0C0);
  static const Color _bronzeColor = Color(0xFFCD7F32);
  static const Color _regularColor = Color(0xFF9E9E9E);

  String? _shopId;
  bool _loadingShop = true;

  @override
  void initState() {
    super.initState();
    _loadShopId();
  }

  Future<void> _loadShopId() async {
    try {
      final user = _authService.currentUser;
      if (user == null) return;
      final shops = await FirebaseFirestore.instance
          .collection('shops')
          .where('ownerId', isEqualTo: user.uid)
          .limit(1)
          .get();
      if (mounted) {
        setState(() {
          _shopId = shops.docs.isNotEmpty ? shops.docs.first.id : null;
          _loadingShop = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingShop = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customer Insights'),
        backgroundColor: _primaryColor,
        foregroundColor: Colors.white,
      ),
      body: _loadingShop
          ? const Center(child: CircularProgressIndicator())
          : _shopId == null
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.store, size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      const Text('No shop found'),
                    ],
                  ),
                )
              : StreamBuilder<List<CustomerProfile>>(
                  stream: _smeService.getShopCustomers(_shopId!),
                  builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }

          if (!snapshot.hasData) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.insights, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  const Text('No customer data available'),
                ],
              ),
            );
          }

          final customers = snapshot.data!;

          if (customers.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.group_outlined, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  const Text('No customers yet'),
                ],
              ),
            );
          }

          final totalCustomers = customers.length;
          final repeatBuyers =
              customers.where((c) => c.totalOrders > 1).length;
          final repeatRate =
              totalCustomers > 0 ? (repeatBuyers / totalCustomers) * 100 : 0.0;

          final goldCount =
              customers.where((c) => c.totalSpent > 500000).length;
          final silverCount =
              customers.where((c) => c.totalSpent > 200000 && c.totalSpent <= 500000).length;
          final bronzeCount =
              customers.where((c) => c.totalSpent > 50000 && c.totalSpent <= 200000).length;
          final regularCount =
              customers.where((c) => c.totalSpent <= 50000).length;

          final topCustomers = List<CustomerProfile>.from(customers)
            ..sort((a, b) => b.totalSpent.compareTo(a.totalSpent));
          final top10 = topCustomers.take(10).toList();

          final recentCustomers = List<CustomerProfile>.from(customers)
            ..sort((a, b) => b.lastOrderAt.compareTo(a.lastOrderAt));
          final recent10 = recentCustomers.take(10).toList();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSummaryCards(
                  totalCustomers: totalCustomers,
                  repeatBuyers: repeatBuyers,
                  repeatRate: repeatRate,
                ),
                const SizedBox(height: 24),
                _buildSectionTitle('Customer Tier Breakdown'),
                const SizedBox(height: 12),
                _buildTierBreakdown(
                  totalCustomers: totalCustomers,
                  goldCount: goldCount,
                  silverCount: silverCount,
                  bronzeCount: bronzeCount,
                  regularCount: regularCount,
                ),
                const SizedBox(height: 24),
                _buildSectionTitle('Top Customers'),
                const SizedBox(height: 12),
                ...top10.map((c) => _buildTopCustomerCard(c)),
                if (top10.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No customers to rank'),
                  ),
                const SizedBox(height: 24),
                _buildSectionTitle('Recent Customers'),
                const SizedBox(height: 12),
                ...recent10.map((c) => _buildRecentCustomerCard(c)),
                if (recent10.isEmpty)
                  const Padding(
                    padding: EdgeInsets.all(16),
                    child: Text('No recent customers'),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSummaryCards({
    required int totalCustomers,
    required int repeatBuyers,
    required double repeatRate,
  }) {
    return Row(
      children: [
        Expanded(
          child: _buildSummaryCard(
            title: 'Total Customers',
            value: totalCustomers.toString(),
            icon: Icons.group,
            color: _primaryColor,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildSummaryCard(
            title: 'Repeat Buyers',
            value: repeatBuyers.toString(),
            icon: Icons.replay,
            color: Colors.teal,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _buildSummaryCard(
            title: 'Repeat Rate',
            value: '${repeatRate.toStringAsFixed(1)}%',
            icon: Icons.percent,
            color: Colors.green.shade700,
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
        child: Column(
          children: [
            Icon(icon, color: color, size: 28),
            const SizedBox(height: 8),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 18,
        fontWeight: FontWeight.bold,
        color: _primaryColor,
      ),
    );
  }

  Widget _buildTierBreakdown({
    required int totalCustomers,
    required int goldCount,
    required int silverCount,
    required int bronzeCount,
    required int regularCount,
  }) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            _buildTierBar(
              label: 'Gold',
              sublabel: '> 500,000 TSh',
              count: goldCount,
              total: totalCustomers,
              color: _goldColor,
            ),
            const SizedBox(height: 12),
            _buildTierBar(
              label: 'Silver',
              sublabel: '> 200,000 TSh',
              count: silverCount,
              total: totalCustomers,
              color: _silverColor,
            ),
            const SizedBox(height: 12),
            _buildTierBar(
              label: 'Bronze',
              sublabel: '> 50,000 TSh',
              count: bronzeCount,
              total: totalCustomers,
              color: _bronzeColor,
            ),
            const SizedBox(height: 12),
            _buildTierBar(
              label: 'Regular',
              sublabel: '< 50,000 TSh',
              count: regularCount,
              total: totalCustomers,
              color: _regularColor,
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTierBar({
    required String label,
    required String sublabel,
    required int count,
    required int total,
    required Color color,
  }) {
    final percentage = total > 0 ? count / total : 0.0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                Container(
                  width: 12,
                  height: 12,
                  decoration: BoxDecoration(
                    color: color,
                    shape: BoxShape.circle,
                  ),
                ),
                const SizedBox(width: 8),
                Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(width: 6),
                Text(
                  sublabel,
                  style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                ),
              ],
            ),
            Text(
              '$count (${(percentage * 100).toStringAsFixed(1)}%)',
              style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: percentage,
            backgroundColor: Colors.grey[200],
            valueColor: AlwaysStoppedAnimation<Color>(color),
            minHeight: 10,
          ),
        ),
      ],
    );
  }

  Widget _buildTopCustomerCard(CustomerProfile customer) {
    final tier = _getCustomerTier(customer);
    final tierColor = _getCustomerTierColor(customer);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: tierColor,
          child: Text(
            (customer.name ?? 'C')[0].toUpperCase(),
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(
          customer.name ?? 'Unknown Customer',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          '${customer.totalOrders} orders',
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: tierColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: tierColor, width: 1),
              ),
              child: Text(
                tier,
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: tierColor,
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'TSh ${_currencyFormat.format(customer.totalSpent)}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 13,
                color: _primaryColor,
              ),
            ),
          ],
        ),
        isThreeLine: true,
      ),
    );
  }

  Widget _buildRecentCustomerCard(CustomerProfile customer) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _primaryColor,
          child: Text(
            (customer.name ?? 'C')[0].toUpperCase(),
            style: const TextStyle(
                color: Colors.white, fontWeight: FontWeight.bold),
          ),
        ),
        title: Text(
          customer.name ?? 'Unknown Customer',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        subtitle: Text(
          customer.phone,
          style: TextStyle(fontSize: 12, color: Colors.grey[600]),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              _formatDate(customer.lastOrderAt),
              style: TextStyle(fontSize: 11, color: Colors.grey[500]),
            ),
            const SizedBox(height: 2),
            Text(
              'TSh ${_currencyFormat.format(customer.totalSpent)}',
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 12,
                color: _primaryColor,
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _getCustomerTier(CustomerProfile customer) {
    if (customer.totalSpent > 500000) return 'Gold';
    if (customer.totalSpent > 200000) return 'Silver';
    if (customer.totalSpent > 50000) return 'Bronze';
    return 'Regular';
  }

  Color _getCustomerTierColor(CustomerProfile customer) {
    if (customer.totalSpent > 500000) return _goldColor;
    if (customer.totalSpent > 200000) return Colors.blue;
    if (customer.totalSpent > 50000) return _bronzeColor;
    return _regularColor;
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
