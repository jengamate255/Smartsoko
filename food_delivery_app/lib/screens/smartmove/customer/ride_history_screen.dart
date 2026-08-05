import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'ride_booking_screen.dart';
import '../../../models/smartmove/ride.dart';
import '../../../models/smartmove/ride_request.dart';
import '../../../models/smartmove/fare_breakdown.dart';
import '../../../services/smartmove/ride_service.dart';
import '../../../services/supabase_service.dart';
import '../../../utils/app_theme.dart';
import '../../../widgets/smartmove/driver_card.dart';

class RideHistoryScreen extends StatefulWidget  {
  const RideHistoryScreen({super.key});

  @override
  State<RideHistoryScreen> createState() => _RideHistoryScreenState();
}

class _RideHistoryScreenState extends State<RideHistoryScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final _rideService = SmartMoveRideService();
  
  List<Ride> _completedRides = [];
  List<Ride> _cancelledRides = [];
  List<Ride> _scheduledRides = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadRideHistory();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadRideHistory() async {
    setState(() => _isLoading = true);
    try {
      final userId = SupabaseService().client.auth.currentUser!.id;
      final rides = await _rideService.getCustomerRideHistory(userId);
      
      if (mounted) {
        setState(() {
          _completedRides = rides.where((r) => r.status == RideStatus.completed).toList();
          _cancelledRides = rides.where((r) => r.status == RideStatus.cancelled).toList();
          _scheduledRides = rides.where((r) => 
            r.scheduledFor != null && 
            r.scheduledFor!.isAfter(DateTime.now()) &&
            r.status != RideStatus.completed &&
            r.status != RideStatus.cancelled
          ).toList();
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
        title: const Text('Ride History'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          tabs: const [
            Tab(text: 'Completed'),
            Tab(text: 'Scheduled'),
            Tab(text: 'Cancelled'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildRideList(_completedRides, true),
                _buildRideList(_scheduledRides, false),
                _buildRideList(_cancelledRides, false),
              ],
            ),
    );
  }

  Widget _buildRideList(List<Ride> rides, bool isCompleted) {
    if (rides.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              isCompleted ? Icons.history : Icons.schedule,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              isCompleted ? 'No completed rides yet' : 'No ${_tabController.index == 1 ? 'scheduled' : 'cancelled'} rides',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
            if (!isCompleted) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const RideBookingScreen()),
                ),
                child: const Text('Book a Ride'),
              ),
            ],
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadRideHistory,
      child: ListView.builder(
        padding: const EdgeInsets.all(16),
        itemCount: rides.length,
        itemBuilder: (context, index) {
          final ride = rides[index];
          return _buildRideCard(ride, isCompleted);
        },
      ),
    );
  }

  Widget _buildRideCard(Ride ride, bool isCompleted) {
    final dateFormat = DateFormat('MMM d, yyyy • h:mm a');
    final currencyFormat = NumberFormat.currency(locale: 'sw_TZ', symbol: 'TZS ', decimalDigits: 0);

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => _showRideDetails(ride),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with date and status
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: _getStatusColor(ride.status).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      _getStatusIcon(ride.status),
                      color: _getStatusColor(ride.status),
                      size: 20,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          dateFormat.format(ride.createdAt),
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 14,
                          ),
                        ),
                        Text(
                          ride.statusDisplayName,
                          style: TextStyle(
                            fontSize: 12,
                            color: _getStatusColor(ride.status),
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (ride.totalFare != null)
                    Text(
                      currencyFormat.format(ride.totalFare!),
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: AppTheme.primaryColor,
                      ),
                    ),
                ],
              ),
              
              const SizedBox(height: 16),
              
              // Route
              Row(
                children: [
                  // Pickup
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Colors.green,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text('Pickup', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Padding(
                          padding: const EdgeInsets.only(left: 12),
                          child: Text(
                            ride.pickupAddress,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  // Line
                  Container(
                    width: 1,
                    height: 40,
                    color: Colors.grey[300],
                    margin: const EdgeInsets.symmetric(horizontal: 4),
                  ),
                  
                  // Dropoff
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 8,
                              height: 8,
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 8),
                            const Text('Drop-off', style: TextStyle(fontSize: 11, color: Colors.grey)),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Padding(
                          padding: const EdgeInsets.only(left: 12),
                          child: Text(
                            ride.dropoffAddress,
                            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
              
              if (isCompleted && ride.actualDistanceKm != null) ...[
                const SizedBox(height: 12),
                Divider(color: Colors.grey[200]),
                const SizedBox(height: 8),
                Row(
                  children: [
                    if (ride.actualDistanceKm != null) ...[
                      Icon(Icons.route, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text('${ride.actualDistanceKm!.toStringAsFixed(1)} km', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                      const SizedBox(width: 16),
                    ],
                    if (ride.actualDurationMinutes != null) ...[
                      Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text('${ride.actualDurationMinutes} min', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                    ],
                    const Spacer(),
                    if (ride.customerRating != null) ...[
                      Icon(Icons.star, size: 16, color: Colors.amber),
                      const SizedBox(width: 4),
                      Text(ride.customerRating!.toStringAsFixed(1), style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500)),
                    ],
                  ],
                ),
              ],
              
              // Actions for scheduled rides
              if (!isCompleted && ride.scheduledFor != null) ...[
                const SizedBox(height: 12),
                Divider(color: Colors.grey[200]),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _rescheduleRide(ride),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: AppTheme.primaryColor,
                          side: BorderSide(color: AppTheme.primaryColor),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Reschedule'),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: OutlinedButton(
                        onPressed: () => _cancelScheduledRide(ride),
                        style: OutlinedButton.styleFrom(
                          foregroundColor: Colors.red,
                          side: const BorderSide(color: Colors.red),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: const Text('Cancel'),
                      ),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  void _showRideDetails(Ride ride) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => DraggableScrollableSheet(
        initialChildSize: 0.7,
        maxChildSize: 0.9,
        minChildSize: 0.5,
        builder: (context, scrollController) => Container(
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: SingleChildScrollView(
            controller: scrollController,
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey[300],
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  'Ride Details',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 20),
                
                _buildDetailRow('Status', ride.statusDisplayName, _getStatusColor(ride.status)),
                _buildDetailRow('Date', DateFormat('MMMM d, yyyy • h:mm a').format(ride.createdAt)),
                if (ride.scheduledFor != null)
                  _buildDetailRow('Scheduled For', DateFormat('MMMM d, yyyy • h:mm a').format(ride.scheduledFor!)),
                _buildDetailRow('Pickup', ride.pickupAddress),
                _buildDetailRow('Drop-off', ride.dropoffAddress),
                if (ride.actualDistanceKm != null)
                  _buildDetailRow('Distance', '${ride.actualDistanceKm!.toStringAsFixed(1)} km'),
                if (ride.actualDurationMinutes != null)
                  _buildDetailRow('Duration', '${ride.actualDurationMinutes} min'),
                if (ride.totalFare != null)
                  _buildDetailRow('Total Fare', NumberFormat.currency(locale: 'sw_TZ', symbol: 'TZS ', decimalDigits: 0).format(ride.totalFare!), AppTheme.primaryColor, true),
                
                if (ride.fareBreakdown.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  const Text('Fare Breakdown', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16)),
                  const SizedBox(height: 8),
                  FareBreakdownWidget(breakdown: FareBreakdown.fromJson(ride.fareBreakdown)),
                ],
                
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Close', style: TextStyle(fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, [Color? color, bool isBold = false]) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(label, style: TextStyle(fontSize: 14, color: Colors.grey[600])),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
                color: color ?? Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Color _getStatusColor(RideStatus status) {
    switch (status) {
      case RideStatus.completed: return Colors.green;
      case RideStatus.cancelled: return Colors.red;
      case RideStatus.inProgress: return Colors.blue;
      case RideStatus.driverArrived: return Colors.orange;
      case RideStatus.driverEnRoute: return Colors.blue;
      case RideStatus.assigned: return Colors.purple;
      case RideStatus.disputed: return Colors.red;
    }
  }

  IconData _getStatusIcon(RideStatus status) {
    switch (status) {
      case RideStatus.completed: return Icons.check_circle;
      case RideStatus.cancelled: return Icons.cancel;
      case RideStatus.inProgress: return Icons.directions_car;
      case RideStatus.driverArrived: return Icons.location_on;
      case RideStatus.driverEnRoute: return Icons.navigation;
      case RideStatus.assigned: return Icons.person;
      case RideStatus.disputed: return Icons.report;
    }
  }

  Future<void> _rescheduleRide(Ride ride) async {
    // Navigate to booking screen with pre-filled data
  }

  Future<void> _cancelScheduledRide(Ride ride) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Cancel Scheduled Ride'),
        content: const Text('Are you sure you want to cancel this scheduled ride?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep')),
          ElevatedButton(
            onPressed: () => Navigator.pop(context, true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Cancel'),
          ),
        ],
      ),
    );
    
    if (confirmed == true) {
      // Cancel the ride
      await _rideService.cancelRideRequest(ride.rideRequestId, SupabaseService().client.auth.currentUser!.id);
      _loadRideHistory();
    }
  }
}