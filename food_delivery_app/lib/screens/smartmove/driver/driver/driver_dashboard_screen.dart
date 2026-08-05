import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:provider/provider.dart';
import '../../../models/smartmove/driver_profile.dart';
import '../../../models/smartmove/ride.dart';
import '../../../models/smartmove/ride_request.dart';
import '../../../models/smartmove/driver_earnings.dart';
import '../../../services/smartmove/driver_service.dart';
import '../../../services/smartmove/tracking_service.dart';
import '../../../services/smartmove/ride_service.dart';
import '../../../config/app_config.dart';
import '../../../utils/app_theme.dart';
import '../../../widgets/smartmove/driver_card.dart';
import 'driver_earnings_screen.dart';
import '../customer/ride_tracking_screen.dart';

class SmartMoveDriverDashboardScreen extends StatefulWidget {
  final String userId;

  const SmartMoveDriverDashboardScreen({super.key, required this.userId});

  @override
  State<SmartMoveDriverDashboardScreen> createState() => _SmartMoveDriverDashboardScreenState();
}

class _SmartMoveDriverDashboardScreenState extends State<SmartMoveDriverDashboardScreen> {
  final _driverService = SmartMoveDriverService();
  final _trackingService = SmartMoveTrackingService();
  final _rideService = SmartMoveRideService();

  DriverProfile? _profile;
  List<RideRequest> _availableRequests = [];
  Ride? _activeRide;
  DriverEarningsSummary? _earningsSummary;

  int _currentNavIndex = 0;

  @override
  void initState() {
    super.initState();
    _loadDriverData();
    _startLocationUpdates();
  }

  @override
  void dispose() {
    _trackingService.dispose();
    _stopLocationUpdates();
    super.dispose();
  }

  Future<void> _loadDriverData() async {
    final profile = await _driverService.getDriverProfile(widget.userId);
    if (profile != null && mounted) {
      setState(() => _profile = profile);
      _loadActiveRide();
      _loadEarningsSummary();
      if (profile.isOnline) {
        _loadAvailableRequests();
      }
    }
  }

  Future<void> _loadActiveRide() async {
    final ride = await _driverService.getActiveRide(widget.userId);
    if (mounted) setState(() => _activeRide = ride);
  }

  Future<void> _loadEarningsSummary() async {
    final earnings = await _driverService.getEarningsSummary(widget.userId);
    if (mounted) setState(() => _earningsSummary = earnings);
  }

  Future<void> _loadAvailableRequests() async {
    final requests = await _driverService.getAvailableRides(widget.userId);
    if (mounted) setState(() => _availableRequests = requests);
  }

  Timer? _locationTimer;

  void _startLocationUpdates() {
    _locationTimer = Timer.periodic(const Duration(seconds: 10), (_) async {
      if (_profile?.isOnline == true) {
        // await _driverService.updateLocation(...);
      }
    });
  }

  void _stopLocationUpdates() {
    _locationTimer?.cancel();
  }

  Future<void> _toggleOnlineStatus(bool online) async {
    final success = await _driverService.setOnlineStatus(widget.userId, online);
    if (success && mounted) {
      setState(() {
        _profile = _profile?.copyWith(isOnline: online);
      });
      if (online) {
        _loadAvailableRequests();
      } else {
        setState(() => _availableRequests = []);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0b1326),
      body: _profile == null
          ? const Center(child: CircularProgressIndicator(color: Color(0xFFadc6ff)))
          : _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_activeRide != null) {
      return _buildActiveRideView();
    }

    return Stack(
      children: [
        FlutterMap(
          options: const MapOptions(
            initialCenter: LatLng(-6.7924, 39.2083),
            initialZoom: 14.0,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}@2x?access_token=${AppConfig.mapboxToken}',
              userAgentPackageName: 'com.smartsoko.smartmove',
            ),
          ],
        ),
        SafeArea(
          child: Column(
            children: [
              _buildTopBar(),
              const Spacer(),
              _buildOnlineToggleCard(),
              const SizedBox(height: 12),
              _buildStatsCards(),
              const SizedBox(height: 12),
              _buildTripStats(),
              const SizedBox(height: 16),
            ],
          ),
        ),
        Positioned(
          left: 0,
          right: 0,
          bottom: 0,
          child: _buildBottomNav(),
        ),
      ],
    );
  }

  Widget _buildTopBar() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
      child: Row(
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              border: Border.all(color: const Color(0xFFadc6ff), width: 2),
            ),
            child: ClipOval(
              child: Container(
                color: const Color(0xFF2d3449),
                child: const Icon(Icons.person, color: Color(0xFFdae2fd), size: 22),
              ),
            ),
          ),
          const SizedBox(width: 12),
          const Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('LUXE DRIVER', style: TextStyle(color: Color(0xFFdae2fd), fontSize: 16, fontWeight: FontWeight.w700, letterSpacing: 1.5)),
              Text('Online · Dar es Salaam', style: TextStyle(color: Color(0xFF8c909f), fontSize: 12)),
            ],
          ),
          const Spacer(),
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined, color: Color(0xFFdae2fd), size: 24),
                onPressed: _showNotifications,
              ),
              Positioned(
                right: 8,
                top: 6,
                child: Container(
                  width: 8,
                  height: 8,
                  decoration: const BoxDecoration(
                    color: Color(0xFF5de6ff),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildOnlineToggleCard() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF131b2e).withOpacity(0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Icon(
                _profile!.isOnline ? Icons.wifi : Icons.wifi_off,
                color: _profile!.isOnline ? const Color(0xFF5de6ff) : const Color(0xFF8c909f),
                size: 20,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  _profile!.isOnline ? "You're online" : 'Go online to start',
                  style: const TextStyle(color: Color(0xFFdae2fd), fontSize: 15, fontWeight: FontWeight.w600),
                ),
              ),
              Switch(
                value: _profile!.isOnline,
                onChanged: _toggleOnlineStatus,
                activeColor: const Color(0xFF5de6ff),
                activeTrackColor: const Color(0xFF5de6ff).withOpacity(0.3),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _buildMiniStat('High Demand', '\$${(12 + (DateTime.now().hour % 6)).toString()}.50', const Color(0xFF5de6ff)),
              const SizedBox(width: 12),
              _buildMiniStat('Exclusive', 'Premium', const Color(0xFFadc6ff)),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMiniStat(String label, String value, Color accent) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: const Color(0xFF171f33),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Container(
              width: 6,
              height: 6,
              decoration: BoxDecoration(color: accent, shape: BoxShape.circle),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(color: Color(0xFF8c909f), fontSize: 11)),
                Text(value, style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w700)),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsCards() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF131b2e).withOpacity(0.85),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text("Today's Earnings", style: TextStyle(color: Color(0xFF8c909f), fontSize: 12)),
                  const SizedBox(height: 6),
                  Text(
                    _earningsSummary?.formattedBalance ?? 'TZS 0',
                    style: const TextStyle(color: Color(0xFFdae2fd), fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: const LinearProgressIndicator(
                      value: 0.3,
                      backgroundColor: Color(0xFF2d3449),
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFFadc6ff)),
                      minHeight: 4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text(
                    'Goal: TZS 50,000',
                    style: TextStyle(color: Color(0xFF8c909f), fontSize: 10),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFF131b2e).withOpacity(0.85),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: Colors.white.withOpacity(0.06)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Active Hours', style: TextStyle(color: Color(0xFF8c909f), fontSize: 12)),
                  const SizedBox(height: 6),
                  const Text(
                    '0.0h',
                    style: TextStyle(color: Color(0xFFdae2fd), fontSize: 22, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 8),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: const LinearProgressIndicator(
                      value: 0.0,
                      backgroundColor: Color(0xFF2d3449),
                      valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF5de6ff)),
                      minHeight: 4,
                    ),
                  ),
                  const SizedBox(height: 4),
                  const Text('Target: 12h', style: TextStyle(color: Color(0xFF8c909f), fontSize: 10)),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTripStats() {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 16),
      decoration: BoxDecoration(
        color: const Color(0xFF131b2e).withOpacity(0.85),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Row(
        children: [
          _buildStatItem(Icons.route, 'Trips', _profile?.completedRides.toString() ?? '0'),
          _buildStatDivider(),
          _buildStatItem(Icons.star, 'Rating', _profile?.rating.toStringAsFixed(2) ?? '0.00'),
          _buildStatDivider(),
          _buildStatItem(Icons.check_circle_outline, 'Acceptance', '${_profile?.acceptanceRate?.toStringAsFixed(0) ?? '100'}%'),
        ],
      ),
    );
  }

  Widget _buildStatItem(IconData icon, String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Icon(icon, color: const Color(0xFFadc6ff), size: 18),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(color: Color(0xFFdae2fd), fontSize: 16, fontWeight: FontWeight.w700)),
          Text(label, style: const TextStyle(color: Color(0xFF8c909f), fontSize: 10)),
        ],
      ),
    );
  }

  Widget _buildStatDivider() {
    return Container(width: 1, height: 32, color: const Color(0xFF2d3449));
  }

  Widget _buildBottomNav() {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF131b2e).withOpacity(0.95),
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.06))),
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _buildNavItem(Icons.home_rounded, 'Home', 0),
              _buildNavItem(Icons.account_balance_wallet_rounded, 'Earnings', 1),
              _buildNavItem(Icons.bar_chart_rounded, 'Performance', 2),
              _buildNavItem(Icons.person_rounded, 'Account', 3),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(IconData icon, String label, int index) {
    final isActive = _currentNavIndex == index;
    return InkWell(
      onTap: () {
        setState(() => _currentNavIndex = index);
        if (index == 1) _showEarnings();
        else if (index == 2) _showPerformance();
        else if (index == 3) _showAccount();
      },
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: isActive ? const Color(0xFF5de6ff) : const Color(0xFF8c909f), size: 22),
            const SizedBox(height: 2),
            Text(label, style: TextStyle(fontSize: 10, color: isActive ? const Color(0xFF5de6ff) : const Color(0xFF8c909f), fontWeight: isActive ? FontWeight.w600 : FontWeight.w400)),
          ],
        ),
      ),
    );
  }

  Widget _buildActiveRideView() {
    return Column(
      children: [
        Expanded(
          flex: 3,
          child: _buildRideMap(),
        ),
        Expanded(
          flex: 1,
          child: _buildActiveRidePanel(),
        ),
      ],
    );
  }

  Widget _buildRideMap() {
    return Stack(
      children: [
        FlutterMap(
          options: const MapOptions(
            initialCenter: LatLng(-6.7924, 39.2083),
            initialZoom: 14.0,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://api.mapbox.com/styles/v1/mapbox/streets-v11/tiles/{z}/{x}/{y}@2x?access_token=${AppConfig.mapboxToken}',
              userAgentPackageName: 'com.smartsoko.smartmove',
            ),
            if (_activeRide != null)
              MarkerLayer(
                markers: [
                  Marker(
                    point: LatLng(_activeRide!.pickupLatitude, _activeRide!.pickupLongitude),
                    child: const Icon(Icons.location_on, color: Colors.green, size: 32),
                  ),
                  Marker(
                    point: LatLng(_activeRide!.dropoffLatitude, _activeRide!.dropoffLongitude),
                    child: const Icon(Icons.location_on, color: Colors.red, size: 32),
                  ),
                ],
              ),
          ],
        ),
      ],
    );
  }

  Widget _buildActiveRidePanel() {
    if (_activeRide == null) return const SizedBox.shrink();

    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF131b2e),
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
        border: Border(top: BorderSide(color: Color(0xFF2d3449))),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Center(
            child: Container(
              width: 40,
              height: 4,
              decoration: BoxDecoration(color: const Color(0xFF2d3449), borderRadius: BorderRadius.circular(2)),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  color: const Color(0xFFadc6ff).withOpacity(0.15),
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  _activeRide!.statusDisplayName,
                  style: const TextStyle(color: Color(0xFFadc6ff), fontWeight: FontWeight.w600, fontSize: 12),
                ),
              ),
              const Spacer(),
              Text(
                'TZS ${_activeRide!.totalFare?.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},') ?? '0'}',
                style: const TextStyle(color: Color(0xFFdae2fd), fontWeight: FontWeight.bold, fontSize: 18),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Icon(Icons.circle, color: Colors.green, size: 12),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _activeRide!.pickupAddress,
                  style: const TextStyle(color: Color(0xFFdae2fd), fontWeight: FontWeight.w500, fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.only(left: 5),
            child: Container(width: 1, height: 18, color: const Color(0xFF2d3449)),
          ),
          Row(
            children: [
              const Icon(Icons.location_on, color: Colors.red, size: 14),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  _activeRide!.dropoffAddress,
                  style: const TextStyle(color: Color(0xFFdae2fd), fontWeight: FontWeight.w500, fontSize: 14),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _acceptRide(RideRequest request) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF131b2e),
        title: const Text('Accept Ride?', style: TextStyle(color: Color(0xFFdae2fd))),
        content: Text('Pickup: ${request.pickupAddress}\nDropoff: ${request.dropoffAddress}', style: const TextStyle(color: Color(0xFFc2c6d6))),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Reject', style: TextStyle(color: Color(0xFF8c909f)))),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFadc6ff)),
            child: const Text('Accept', style: TextStyle(color: Color(0xFF002e6a))),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await _driverService.acceptRide(request.id, widget.userId);
      _loadActiveRide();
    }
  }

  Future<void> _rejectRide(RideRequest request) async {
    await _driverService.rejectRide(request.id, widget.userId);
    _loadAvailableRequests();
  }

  void _showNotifications() {}

  void _showEarnings() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => DriverEarningsScreen(userId: widget.userId)),
    );
  }

  void _showPerformance() {}

  void _showAccount() {}
}
