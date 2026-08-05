import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/analytics_service.dart';
import '../../services/restaurant_service.dart';
import '../../widgets/offline_indicator.dart';
import 'merchant_order_list_screen.dart';
import 'menu_management_screen.dart';
import 'restaurant_settings_screen.dart';
import 'merchant_customer_insights_screen.dart';
import 'merchant_reviews_screen.dart';
import 'csv_import_screen.dart';

class MerchantMainScreen extends StatefulWidget {
  const MerchantMainScreen({super.key});

  @override
  State<MerchantMainScreen> createState() => _MerchantMainScreenState();
}

class _MerchantMainScreenState extends State<MerchantMainScreen> {
  int _currentIndex = 0;
  final AnalyticsService _analyticsService = AnalyticsService();

  final List<Widget> _screens = const [
    _DashboardTab(),
    _OrdersTab(),
    _MenuTab(),
    _SettingsTab(),
  ];

  @override
  void initState() {
    super.initState();
    _logScreenView('MerchantMain');
  }

  Future<void> _logScreenView(String screenName) async {
    await _analyticsService.logScreenView(
      screenName: screenName,
      screenClass: screenName,
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: Column(
        children: [
          const AnimatedOfflineIndicator(),
          Expanded(
            child: _screens[_currentIndex],
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) {
          setState(() {
            _currentIndex = index;
          });
          final screenNames = ['MerchantDashboard', 'MerchantOrders', 'MerchantMenu', 'MerchantSettings'];
          _logScreenView(screenNames[index]);
        },
        elevation: 3,
        shadowColor: Colors.black26,
        backgroundColor: theme.colorScheme.surface,
        indicatorColor: theme.colorScheme.primaryContainer,
        height: 72,
        labelBehavior: NavigationDestinationLabelBehavior.alwaysShow,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined),
            selectedIcon: Icon(Icons.dashboard, color: Color(0xFF064E3B)),
            label: 'Home',
          ),
          NavigationDestination(
            icon: Icon(Icons.receipt_long_outlined),
            selectedIcon: Icon(Icons.receipt_long, color: Color(0xFF064E3B)),
            label: 'Orders',
          ),
          NavigationDestination(
            icon: Icon(Icons.restaurant_menu_outlined),
            selectedIcon: Icon(Icons.restaurant_menu, color: Color(0xFF064E3B)),
            label: 'Menu',
          ),
          NavigationDestination(
            icon: Icon(Icons.settings_outlined),
            selectedIcon: Icon(Icons.settings, color: Color(0xFF064E3B)),
            label: 'Settings',
          ),
        ],
      ),
    );
  }
}

class _DashboardTab extends StatelessWidget {
  const _DashboardTab();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return CustomScrollView(
      slivers: [
        SliverAppBar(
          expandedHeight: 100,
          pinned: true,
          backgroundColor: const Color(0xFF064E3B),
          flexibleSpace: FlexibleSpaceBar(
            title: const Text(
              'Merchant Hub',
              style: TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.bold,
                fontSize: 18,
              ),
            ),
            background: Container(
              decoration: const BoxDecoration(
                gradient: LinearGradient(
                  colors: [Color(0xFF064E3B), Color(0xFF10B981)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
              ),
            ),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.all(16),
          sliver: SliverList(
            delegate: SliverChildListDelegate([
              const SizedBox(height: 8),
              // Welcome card
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [Color(0xFF064E3B), Color(0xFF10B981)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF064E3B).withOpacity(0.3),
                      blurRadius: 12,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.storefront, color: Colors.white, size: 28),
                        ),
                        const SizedBox(width: 14),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Good morning!',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              Text(
                                'Your business at a glance',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Stats grid
              _SectionTitle(title: 'Quick Stats'),
              const SizedBox(height: 10),
              GridView.count(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisCount: 2,
                mainAxisSpacing: 12,
                crossAxisSpacing: 12,
                childAspectRatio: 1.5,
                children: [
                  _QuickStatCard(
                    icon: Icons.shopping_bag,
                    label: 'Pending Orders',
                    value: '0',
                    color: Colors.orange,
                  ),
                  _QuickStatCard(
                    icon: Icons.check_circle,
                    label: 'Delivered Today',
                    value: '0',
                    color: Colors.green,
                  ),
                  _QuickStatCard(
                    icon: Icons.payments,
                    label: 'Today\'s Revenue',
                    value: 'TSh 0',
                    color: const Color(0xFF064E3B),
                  ),
                  _QuickStatCard(
                    icon: Icons.star,
                    label: 'Rating',
                    value: '—',
                    color: Colors.amber,
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Quick actions
              _SectionTitle(title: 'Quick Actions'),
              const SizedBox(height: 10),
              _buildQuickActions(context),
              const SizedBox(height: 24),

              // Tips
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: theme.colorScheme.primaryContainer.withOpacity(0.3),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: theme.colorScheme.primary.withOpacity(0.15)),
                ),
                child: Row(
                  children: [
                    Icon(Icons.lightbulb, color: theme.colorScheme.primary, size: 28),
                    const SizedBox(width: 14),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Tip of the Day',
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              color: theme.colorScheme.primary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Keep your menu updated with fresh photos to attract more customers.',
                            style: TextStyle(fontSize: 13, color: Colors.grey[700]),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
            ]),
          ),
        ),
      ],
    );
  }

  Widget _buildQuickActions(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: _QuickActionButton(
            icon: Icons.add_circle_outline,
            label: 'Add Item',
            onTap: () {
              // Navigate to add menu item
            },
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _QuickActionButton(
            icon: Icons.receipt_long,
            label: 'View Orders',
            onTap: () {},
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _QuickActionButton(
            icon: Icons.analytics_outlined,
            label: 'Analytics',
            onTap: () {},
          ),
        ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String title;
  const _SectionTitle({required this.title});

  @override
  Widget build(BuildContext context) {
    return Text(
      title,
      style: const TextStyle(
        fontSize: 16,
        fontWeight: FontWeight.bold,
        color: Color(0xFF1F2937),
      ),
    );
  }
}

class _QuickStatCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;

  const _QuickStatCard({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, color: color, size: 22),
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
              fontSize: 11,
              color: color.withOpacity(0.8),
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _QuickActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(14),
      elevation: 1,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
          child: Column(
            children: [
              Icon(icon, color: const Color(0xFF064E3B), size: 26),
              const SizedBox(height: 6),
              Text(
                label,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF1F2937),
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrdersTab extends StatelessWidget {
  const _OrdersTab();

  @override
  Widget build(BuildContext context) {
    return const MerchantOrderListScreen();
  }
}

class _MenuTab extends StatelessWidget {
  const _MenuTab();

  @override
  Widget build(BuildContext context) {
    return const MenuManagementScreen();
  }
}

class _SettingsTab extends StatefulWidget {
  const _SettingsTab();

  @override
  State<_SettingsTab> createState() => _SettingsTabState();
}

class _SettingsTabState extends State<_SettingsTab> {
  final AuthService _authService = AuthService();
  final RestaurantService _restaurantService = RestaurantService();
  String? _restaurantId;

  @override
  void initState() {
    super.initState();
    _loadRestaurantId();
  }

  Future<void> _loadRestaurantId() async {
    final user = _authService.currentUser;
    if (user == null) return;
    final restaurant = await _restaurantService.getRestaurantByOwnerId(user.uid);
    if (mounted && restaurant != null) {
      setState(() => _restaurantId = restaurant.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(0),
      children: [
        // Profile header
        Container(
          padding: const EdgeInsets.all(24),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF064E3B), Color(0xFF10B981)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
          child: Column(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: Colors.white.withOpacity(0.2),
                child: const Icon(Icons.person, color: Colors.white, size: 40),
              ),
              const SizedBox(height: 12),
              const Text(
                'Merchant Account',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Text(
                  'Verified Merchant',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        _buildSectionHeader('Business'),
        _buildSettingsTile(
          icon: Icons.store,
          title: 'Restaurant Info',
          subtitle: 'Manage your restaurant details',
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const RestaurantSettingsScreen()),
            );
          },
        ),
        _buildSettingsTile(
          icon: Icons.schedule,
          title: 'Operating Hours',
          subtitle: 'Set your opening and closing times',
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const RestaurantSettingsScreen()),
            );
          },
        ),
        _buildSettingsTile(
          icon: Icons.delivery_dining,
          title: 'Delivery Settings',
          subtitle: 'Fees and delivery time',
          onTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const RestaurantSettingsScreen()),
            );
          },
        ),
        const SizedBox(height: 8),
        _buildSectionHeader('Analytics & Feedback'),
        _buildSettingsTile(
          icon: Icons.people,
          title: 'Customer Insights',
          subtitle: 'View customer analytics and tiers',
          onTap: () {
            if (_restaurantId == null) return;
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => MerchantCustomerInsightsScreen(restaurantId: _restaurantId!),
              ),
            );
          },
        ),
        _buildSettingsTile(
          icon: Icons.star_rate,
          title: 'Reviews',
          subtitle: 'Manage customer reviews and replies',
          onTap: () {
            if (_restaurantId == null) return;
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => MerchantReviewsScreen(shopId: _restaurantId!),
              ),
            );
          },
        ),
        _buildSettingsTile(
          icon: Icons.upload_file,
          title: 'Import / Export Products',
          subtitle: 'Bulk import from CSV or export your catalog',
          onTap: () {
            if (_restaurantId == null) return;
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => CsvImportScreen(restaurantId: _restaurantId!),
              ),
            );
          },
        ),
        const SizedBox(height: 8),
        _buildSectionHeader('Account'),
        _buildSettingsTile(
          icon: Icons.person_outline,
          title: 'Profile',
          subtitle: 'Manage your account',
          onTap: () {},
        ),
        _buildSettingsTile(
          icon: Icons.help_outline,
          title: 'Help & Support',
          subtitle: 'Get help with your account',
          onTap: () {},
        ),
        const SizedBox(height: 8),
        _buildSettingsTile(
          icon: Icons.logout,
          title: 'Logout',
          subtitle: 'Sign out of your account',
          iconColor: Colors.red,
          titleColor: Colors.red,
          onTap: () async {
            final authService = Provider.of<AuthService>(context, listen: false);
            await authService.signOut();
          },
        ),
        const SizedBox(height: 32),
      ],
    );
  }

  Widget _buildSectionHeader(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Text(
        title.toUpperCase(),
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: Colors.grey,
          letterSpacing: 1.2,
        ),
      ),
    );
  }

  Widget _buildSettingsTile({
    required IconData icon,
    required String title,
    required String subtitle,
    required VoidCallback onTap,
    Color? iconColor,
    Color? titleColor,
  }) {
    return ListTile(
      leading: CircleAvatar(
        backgroundColor: (iconColor ?? const Color(0xFF064E3B)).withOpacity(0.1),
        child: Icon(icon, color: iconColor ?? const Color(0xFF064E3B), size: 20),
      ),
      title: Text(
        title,
        style: TextStyle(
          fontWeight: FontWeight.w600,
          color: titleColor,
        ),
      ),
      subtitle: Text(subtitle, style: const TextStyle(fontSize: 12)),
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
    );
  }
}
