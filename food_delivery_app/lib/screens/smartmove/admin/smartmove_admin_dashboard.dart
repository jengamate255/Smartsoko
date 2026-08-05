import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../../../services/supabase_service.dart';
import '../../../utils/app_theme.dart';
import '../../admin/smartmove/smartmove_drivers_screen.dart';
import '../../admin/smartmove/smartmove_documents_screen.dart';
import '../../admin/smartmove/smartmove_vehicles_screen.dart';
import '../../admin/smartmove/smartmove_suspensions_screen.dart';
import '../../admin/smartmove/smartmove_live_trips_screen.dart';
import '../../admin/smartmove/smartmove_rides_screen.dart';
import '../../admin/smartmove/smartmove_pricing_rules_screen.dart';
import '../../admin/smartmove/smartmove_sos_alerts_screen.dart';
import '../../admin/smartmove/smartmove_emergency_screen.dart';
import '../../admin/smartmove/smartmove_support_tickets_screen.dart';
import '../../admin/smartmove/smartmove_revenue_screen.dart';
import '../../admin/smartmove/smartmove_heatmaps_screen.dart';
import '../../admin/smartmove/smartmove_driver_analytics_screen.dart';
import '../../admin/smartmove/smartmove_fraud_detection_screen.dart';

class SmartMoveAdminDashboard extends StatefulWidget {
  const SmartMoveAdminDashboard({super.key});

  @override
  State<SmartMoveAdminDashboard> createState() => _SmartMoveAdminDashboardState();
}

class _SmartMoveAdminDashboardState extends State<SmartMoveAdminDashboard> {
  final _supabaseService = SupabaseService();
  bool _isLoading = true;
  
  int _onlineDrivers = 0;
  int _activeRides = 0;
  int _totalDrivers = 0;
  int _pendingVerifications = 0;
  int _todayRevenue = 0;
  int _todayRides = 0;
  int _openSosCount = 0;
  List<Map<String, dynamic>> _recentIncidents = [];
  List<Map<String, dynamic>> _pendingDocuments = [];

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
  }

  Future<void> _loadDashboardData() async {
    setState(() => _isLoading = true);
    try {
      final client = _supabaseService.client;

      // Get stats
      final onlineDriversResponse = await client
          .from('driver_profiles')
          .select('id')
          .eq('is_online', true)
          .eq('status', 'approved')
          .count(CountOption.exact);
      final activeRidesResponse = await client
          .from('rides')
          .select('id')
          .inFilter('status', ['assigned', 'driver_en_route', 'driver_arrived', 'in_progress'])
          .count(CountOption.exact);
      final totalDriversResponse = await client
          .from('driver_profiles')
          .select('id')
          .count(CountOption.exact);
      final pendingVerificationsResponse = await client
          .from('driver_profiles')
          .select('id')
          .eq('status', 'pending')
          .count(CountOption.exact);
      final todayRidesResponse = await client
          .from('rides')
          .select('total_fare')
          .gte('created_at', DateTime.now().toIso8601String().split('T')[0])
          .count(CountOption.exact);
      final revenue = todayRidesResponse.data.fold<int>(0, (sum, r) => sum + (r['total_fare'] as int? ?? 0));

      if (mounted) {
        setState(() {
          _onlineDrivers = onlineDriversResponse.count;
          _activeRides = activeRidesResponse.count;
          _totalDrivers = totalDriversResponse.count;
          _pendingVerifications = pendingVerificationsResponse.count;
          _todayRevenue = revenue;
          _todayRides = todayRidesResponse.count;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SmartMove Admin'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _loadDashboardData),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadDashboardData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Stats grid
                    GridView.count(
                      crossAxisCount: 2,
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      childAspectRatio: 1.5,
                      crossAxisSpacing: 12,
                      mainAxisSpacing: 12,
                      children: [
                        _buildStatCard('Online Drivers', _onlineDrivers.toString(), Icons.person, Colors.green),
                        _buildStatCard('Active Rides', _activeRides.toString(), Icons.directions_car, Colors.blue),
                        _buildStatCard('Total Drivers', _totalDrivers.toString(), Icons.people, AppTheme.primaryColor),
                        _buildStatCard('Pending', _pendingVerifications.toString(), Icons.pending, Colors.orange),
                        _buildStatCard("Today's Revenue", 'TZS ${_todayRevenue.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}', Icons.receipt, Colors.teal),
                        _buildStatCard("Today's Rides", _todayRides.toString(), Icons.route, Colors.indigo),
                      ],
                    ),
                    
                    const SizedBox(height: 24),
                    
                    // Management sections
                    _buildSection('Driver Management', Icons.people, [
                      _buildMenuItem('Verify Drivers', Icons.verified_user, '${_pendingVerifications} pending', () => _navigateTo('/admin/smartmove/drivers')),
                      _buildMenuItem('Document Verification', Icons.description, '', () => _navigateTo('/admin/smartmove/documents')),
                      _buildMenuItem('Vehicle Approvals', Icons.directions_car, '', () => _navigateTo('/admin/smartmove/vehicles')),
                      _buildMenuItem('Driver Suspensions', Icons.block, '', () => _navigateTo('/admin/smartmove/suspensions')),
                    ]),
                    
                    const SizedBox(height: 16),
                    
                    _buildSection('Ride Management', Icons.route, [
                      _buildMenuItem('Live Trips', Icons.my_location, '${_activeRides} active', () => _navigateTo('/admin/smartmove/live-trips')),
                      _buildMenuItem('Ride History', Icons.history, '', () => _navigateTo('/admin/smartmove/rides')),
                      _buildMenuItem('Pricing Rules', Icons.attach_money, '', () => _navigateTo('/admin/smartmove/pricing')),
                    ]),
                    
                    const SizedBox(height: 16),
                    
                    _buildSection('Safety & Security', Icons.security, [
                      _buildMenuItem('SOS Alerts', Icons.sos, _openSosCount > 0 ? '${_openSosCount} open' : '', () => _navigateTo('/admin/smartmove/sos')),
                      _buildMenuItem('Emergency Dashboard', Icons.warning, '', () => _navigateTo('/admin/smartmove/emergency')),
                      _buildMenuItem('Support Tickets', Icons.support_agent, '', () => _navigateTo('/admin/smartmove/support')),
                    ]),
                    
                    const SizedBox(height: 16),
                    
                    _buildSection('Analytics', Icons.analytics, [
                      _buildMenuItem('Revenue Analytics', Icons.trending_up, '', () => _navigateTo('/admin/smartmove/revenue')),
                      _buildMenuItem('Heat Maps', Icons.map, '', () => _navigateTo('/admin/smartmove/heatmaps')),
                      _buildMenuItem('Driver Analytics', Icons.assessment, '', () => _navigateTo('/admin/smartmove/driver-analytics')),
                      _buildMenuItem('Fraud Detection', Icons.flag, '', () => _navigateTo('/admin/smartmove/fraud')),
                    ]),
                    
                    const SizedBox(height: 24),
                    
                    Text('Recent SOS Events', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[800])),
                    const SizedBox(height: 12),
                    if (_recentIncidents.isEmpty)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Center(
                            child: Column(
                              children: [
                                Icon(Icons.check_circle, size: 48, color: Colors.green[300]),
                                const SizedBox(height: 8),
                                Text('No recent incidents', style: TextStyle(color: Colors.grey[600])),
                              ],
                            ),
                          ),
                        ),
                      ),
                    
                    const SizedBox(height: 24),
                    Text('Pending Document Verification', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.grey[800])),
                    const SizedBox(height: 12),
                    if (_pendingDocuments.isEmpty)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Center(
                            child: Column(
                              children: [
                                Icon(Icons.checklist, size: 48, color: Colors.green[300]),
                                const SizedBox(height: 8),
                                Text('No pending documents', style: TextStyle(color: Colors.grey[600])),
                              ],
                            ),
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: color.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
              ],
            ),
            const Spacer(),
            Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            Text(title, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
          ],
        ),
      ),
    );
  }

  Widget _buildSection(String title, IconData icon, List<Widget> items) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: AppTheme.primaryColor),
            const SizedBox(width: 8),
            Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ],
        ),
        const SizedBox(height: 8),
        Card(
          elevation: 1,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Column(children: items),
        ),
      ],
    );
  }

  Widget _buildMenuItem(String title, IconData icon, String subtitle, VoidCallback onTap) {
    return ListTile(
      leading: Container(
        padding: const EdgeInsets.all(8),
        decoration: BoxDecoration(
          color: AppTheme.primaryColor.withOpacity(0.1),
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(icon, color: AppTheme.primaryColor, size: 20),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.w500)),
      subtitle: subtitle.isNotEmpty ? Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 12)) : null,
      trailing: const Icon(Icons.chevron_right, color: Colors.grey),
      onTap: onTap,
    );
  }

  void _navigateTo(String route) {
    Widget? screen;
    switch (route) {
      case '/admin/smartmove/drivers': screen = const SmartMoveDriversScreen(); break;
      case '/admin/smartmove/documents': screen = const SmartMoveDocumentsScreen(); break;
      case '/admin/smartmove/vehicles': screen = const SmartMoveVehiclesScreen(); break;
      case '/admin/smartmove/suspensions': screen = const SmartMoveSuspensionsScreen(); break;
      case '/admin/smartmove/live-trips': screen = const SmartMoveLiveTripsScreen(); break;
      case '/admin/smartmove/rides': screen = const SmartMoveRidesScreen(); break;
      case '/admin/smartmove/pricing': screen = const SmartMovePricingRulesScreen(); break;
      case '/admin/smartmove/sos': screen = const SmartMoveSOSAlertsScreen(); break;
      case '/admin/smartmove/emergency': screen = const SmartMoveEmergencyScreen(); break;
      case '/admin/smartmove/support': screen = const SmartMoveSupportTicketsScreen(); break;
      case '/admin/smartmove/revenue': screen = const SmartMoveRevenueScreen(); break;
      case '/admin/smartmove/heatmaps': screen = const SmartMoveHeatmapsScreen(); break;
      case '/admin/smartmove/driver-analytics': screen = const SmartMoveDriverAnalyticsScreen(); break;
      case '/admin/smartmove/fraud': screen = const SmartMoveFraudDetectionScreen(); break;
    }
    if (screen != null) {
      Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
    }
  }
}