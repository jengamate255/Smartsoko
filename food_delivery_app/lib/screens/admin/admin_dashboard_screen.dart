import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _selectedIndex = 0;

  final List<Map<String, dynamic>> _menuItems = [
    {'icon': Icons.dashboard, 'label': 'Dashboard'},
    {'icon': Icons.shopping_bag, 'label': 'Orders'},
    {'icon': Icons.inventory_2, 'label': 'Inventory'},
    {'icon': Icons.local_shipping, 'label': 'Fleet'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFBF9F5),
      body: Row(
        children: [
          // Sidebar
          _buildSidebar(),
          
          // Main Content
          Expanded(
            child: Column(
              children: [
                _buildTopBar(),
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(48),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildStatsCards(),
                        const SizedBox(height: 48),
                        _buildChartsSection(),
                        const SizedBox(height: 48),
                        _buildHeroSection(),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        backgroundColor: const Color(0xFF012D1D),
        child: const Icon(Icons.add, size: 32),
      ),
    );
  }

  Widget _buildSidebar() {
    return Container(
      width: 288,
      decoration: BoxDecoration(
        color: const Color(0xFFFBF9F5),
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(48),
          bottomRight: Radius.circular(48),
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Padding(
            padding: EdgeInsets.all(32),
            child: Text(
              'Harvest Admin',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Color(0xFF012D1D),
              ),
            ),
          ),
          
          Expanded(
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _menuItems.length,
              itemBuilder: (context, index) {
                final item = _menuItems[index];
                final isSelected = index == _selectedIndex;
                
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(50),
                      onTap: () => setState(() => _selectedIndex = index),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 24,
                          vertical: 12,
                        ),
                        decoration: BoxDecoration(
                          color: isSelected
                              ? const Color(0xFFC1ECD4)
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(50),
                        ),
                        child: Row(
                          children: [
                            Icon(
                              item['icon'],
                              color: isSelected
                                  ? const Color(0xFF002114)
                                  : const Color(0xFF414844),
                            ),
                            const SizedBox(width: 16),
                            Text(
                              item['label'],
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.w500,
                                color: isSelected
                                    ? const Color(0xFF002114)
                                    : const Color(0xFF414844),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF5F3EF),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    children: [
                      CircleAvatar(
                        radius: 24,
                        backgroundColor: const Color(0xFF012D1D),
                        child: const Text(
                          'HA',
                          style: TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Harvest Admin',
                              style: TextStyle(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF012D1D),
                              ),
                            ),
                            Text(
                              'Master Curator',
                              style: TextStyle(
                                fontSize: 12,
                                color: Colors.grey[600],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                Text(
                  'v1.2.0',
                  style: TextStyle(
                    fontSize: 10,
                    letterSpacing: 1.5,
                    color: Colors.grey[400],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopBar() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 48, vertical: 32),
      decoration: BoxDecoration(
        color: const Color(0xFFFBF9F5).withOpacity(0.8),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          const Text(
            'The Organic Curator',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.w600,
              color: Color(0xFF012D1D),
            ),
          ),
          Row(
            children: [
              Stack(
                children: [
                  IconButton(
                    icon: const Icon(Icons.notifications_outlined),
                    color: const Color(0xFF012D1D),
                    onPressed: () {},
                  ),
                  Positioned(
                    right: 8,
                    top: 8,
                    child: Container(
                      width: 8,
                      height: 8,
                      decoration: BoxDecoration(
                        color: Colors.orange[800],
                        shape: BoxShape.circle,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(width: 16),
              CircleAvatar(
                radius: 20,
                backgroundColor: const Color(0xFF012D1D),
                child: const Text(
                  'AU',
                  style: TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatsCards() {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Total Sales',
            'TSh 58,450,000',
            '+12.5% from last month',
            Icons.payments,
            const Color(0xFF012D1D),
            Icons.trending_up,
          ),
        ),
        const SizedBox(width: 32),
        Expanded(
          child: _buildStatCard(
            'Active Orders',
            '142',
            '18 needing immediate attention',
            Icons.shopping_cart,
            Colors.orange[800]!,
            Icons.pending_actions,
            hasBorder: true,
          ),
        ),
        const SizedBox(width: 32),
        Expanded(
          child: _buildStatCard(
            'New Customers',
            '84',
            '+5% organic growth',
            Icons.group,
            const Color(0xFF012D1D),
            Icons.person_add,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(
    String title,
    String value,
    String subtitle,
    IconData bgIcon,
    Color accentColor,
    IconData subtitleIcon, {
    bool hasBorder = false,
  }) {
    return Container(
      padding: const EdgeInsets.all(32),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: hasBorder
            ? Border(left: BorderSide(color: accentColor, width: 4))
            : null,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.04),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w500,
                  color: Colors.grey[600],
                ),
              ),
              const SizedBox(height: 8),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 32,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF012D1D),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Icon(subtitleIcon, size: 16, color: accentColor),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      subtitle,
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: accentColor,
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
          Positioned(
            right: -16,
            bottom: -16,
            child: Icon(
              bgIcon,
              size: 120,
              color: Colors.black.withOpacity(0.05),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildChartsSection() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 2,
          child: Container(
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              color: const Color(0xFFF5F3EF),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Daily Sales by Category',
                          style: TextStyle(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF012D1D),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          'Performance tracking for the last 24 hours',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                    Row(
                      children: [
                        Container(
                          width: 12,
                          height: 12,
                          decoration: const BoxDecoration(
                            color: Color(0xFF012D1D),
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Primary Goal',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 40),
                SizedBox(
                  height: 256,
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      _buildBarChart('Grains', 0.75, const Color(0xFF012D1D)),
                      _buildBarChart('Fruits', 0.45, const Color(0xFF012D1D)),
                      _buildBarChart('Dairy', 0.90, Colors.orange[800]!),
                      _buildBarChart('Fish', 0.30, const Color(0xFF012D1D)),
                      _buildBarChart('Others', 0.60, const Color(0xFF012D1D)),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 48),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(40),
            decoration: BoxDecoration(
              color: const Color(0xFFE4E2DE),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'Recent Activity',
                  style: TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF012D1D),
                  ),
                ),
                const SizedBox(height: 32),
                _buildActivityItem(
                  Icons.local_shipping,
                  'Fleet Unit #42 Dispatched',
                  '2 mins ago • Order #8841',
                  const Color(0xFFC1ECD4),
                ),
                const SizedBox(height: 24),
                _buildActivityItem(
                  Icons.inventory_2,
                  'Stock Alert: Golden Wheat',
                  '15 mins ago • Below threshold',
                  const Color(0xFFFFDCC4),
                ),
                const SizedBox(height: 24),
                _buildActivityItem(
                  Icons.verified_user,
                  'New Curator Onboarded',
                  '1 hour ago • Regional Hub A',
                  const Color(0xFFC1ECD4),
                ),
                const SizedBox(height: 24),
                _buildActivityItem(
                  Icons.receipt_long,
                  'Bulk Invoice Generated',
                  '4 hours ago • Organic Roots Ltd.',
                  const Color(0xFFEFEEEA),
                ),
                const SizedBox(height: 40),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton(
                    onPressed: () {},
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      side: BorderSide(color: Colors.grey[400]!),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(50),
                      ),
                    ),
                    child: const Text(
                      'View Full Audit Log',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF012D1D),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildBarChart(String label, double percentage, Color color) {
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Expanded(
              child: Container(
                decoration: BoxDecoration(
                  color: color.withOpacity(0.2),
                  borderRadius: const BorderRadius.vertical(
                    top: Radius.circular(50),
                  ),
                ),
                child: Align(
                  alignment: Alignment.bottomCenter,
                  child: FractionallySizedBox(
                    heightFactor: percentage,
                    child: Container(
                      decoration: BoxDecoration(
                        color: color,
                        borderRadius: const BorderRadius.vertical(
                          top: Radius.circular(50),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.bold,
                color: Color(0xFF012D1D),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildActivityItem(
    IconData icon,
    String title,
    String subtitle,
    Color bgColor,
  ) {
    return Row(
      children: [
        Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: bgColor,
            shape: BoxShape.circle,
          ),
          child: Icon(icon, size: 20, color: const Color(0xFF002114)),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF012D1D),
                ),
              ),
              const SizedBox(height: 4),
              Text(
                subtitle,
                style: TextStyle(
                  fontSize: 12,
                  color: Colors.grey[600],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildHeroSection() {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Curated Supply Management',
                style: TextStyle(
                  fontSize: 36,
                  fontWeight: FontWeight.w800,
                  color: Color(0xFF012D1D),
                  height: 1.2,
                ),
              ),
              const SizedBox(height: 24),
              Text(
                'Your dashboard provides real-time visibility into the heart of the harvest. Monitor logistics, track consumer appetite, and manage your inventory with editorial precision.',
                style: TextStyle(
                  fontSize: 18,
                  color: Colors.grey[700],
                  height: 1.6,
                ),
              ),
              const SizedBox(height: 32),
              Row(
                children: [
                  ElevatedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.analytics),
                    label: const Text('Detailed Reports'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF012D1D),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 32,
                        vertical: 20,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(50),
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  ElevatedButton.icon(
                    onPressed: () {},
                    icon: const Icon(Icons.add_circle),
                    label: const Text('Quick Order'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.orange[700],
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(
                        horizontal: 32,
                        vertical: 20,
                      ),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(50),
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        const SizedBox(width: 48),
        Expanded(
          child: Stack(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: CachedNetworkImage(
                  imageUrl:
                      'https://images.unsplash.com/photo-1610348725531-843dff563e2c?w=600',
                  height: 400,
                  width: double.infinity,
                  fit: BoxFit.cover,
                ),
              ),
              Positioned(
                bottom: 32,
                left: 32,
                right: 32,
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.9),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'LIVE FLEET STATUS',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.5,
                              color: Colors.orange[800],
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            '12 Deliveries En Route',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF012D1D),
                            ),
                          ),
                        ],
                      ),
                      const Icon(
                        Icons.map,
                        size: 32,
                        color: Color(0xFF012D1D),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
