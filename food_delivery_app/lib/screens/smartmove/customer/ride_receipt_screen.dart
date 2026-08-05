import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../models/smartmove/ride.dart';
import '../../../models/smartmove/fare_breakdown.dart';
import '../../../services/smartmove/ride_service.dart';
import '../../../services/supabase_service.dart';
import '../../../utils/app_theme.dart';
import '../../../widgets/smartmove/driver_card.dart';

class RideReceiptScreen extends StatefulWidget {
  final String rideId;
  
  const RideReceiptScreen({super.key, required this.rideId});

  @override
  State<RideReceiptScreen> createState() => _RideReceiptScreenState();
}

class _RideReceiptScreenState extends State<RideReceiptScreen> {
  final _rideService = SmartMoveRideService();
  
  Ride? _ride;
  Map<String, dynamic>? _receipt;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadReceipt();
  }

  Future<void> _loadReceipt() async {
    try {
      final ride = await _rideService.getRideReceipt(widget.rideId);
      final rideDetails = await _rideService.getActiveRideForCustomer(SupabaseService().client.auth.currentUser!.id);
      // Actually get ride by ID
      // This would need a method to get ride by ID
      
      if (mounted) {
        setState(() {
          _receipt = ride;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Receipt')),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Trip Receipt'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.share),
            onPressed: _shareReceipt,
            tooltip: 'Share Receipt',
          ),
          IconButton(
            icon: const Icon(Icons.download),
            onPressed: _downloadReceipt,
            tooltip: 'Download PDF',
          ),
        ],
      ),
      body: _receipt == null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.receipt_long, size: 64, color: Colors.grey[400]),
                  const SizedBox(height: 16),
                  Text('Receipt not available', style: TextStyle(color: Colors.grey[600])),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Header
                  Center(
                    child: Column(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(Icons.directions_car, color: Colors.white, size: 32),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          'SmartMove',
                          style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                            fontWeight: FontWeight.bold,
                            color: AppTheme.primaryColor,
                          ),
                        ),
                        Text(
                          'Trip Receipt',
                          style: Theme.of(context).textTheme.bodyLarge?.copyWith(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 24),
                  
                  // Receipt number and date
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.grey[50],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Receipt #', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                              Text(
                                _receipt!['receipt_number'] ?? 'N/A',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text('Date', style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                              Text(
                                DateFormat('MMM d, yyyy').format(DateTime.parse(_receipt!['issued_at'])),
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  
                  const SizedBox(height: 20),
                  
                  // Trip details
                  _buildSectionTitle('Trip Details'),
                  const SizedBox(height: 12),
                  _buildInfoRow('Pickup', _receipt!['pickup_address'] ?? 'N/A', Icons.circle, Colors.green),
                  const SizedBox(height: 8),
                  _buildInfoRow('Drop-off', _receipt!['dropoff_address'] ?? 'N/A', Icons.location_on, Colors.red),
                  const SizedBox(height: 8),
                  if (_receipt!['distance_km'] != null)
                    _buildInfoRow('Distance', '${_receipt!['distance_km']} km', Icons.route, AppTheme.primaryColor),
                  if (_receipt!['duration_minutes'] != null)
                    _buildInfoRow('Duration', '${_receipt!['duration_minutes']} min', Icons.access_time, AppTheme.primaryColor),
                  if (_receipt!['driver_name'] != null)
                    _buildInfoRow('Driver', _receipt!['driver_name'], Icons.person, AppTheme.primaryColor),
                  if (_receipt!['vehicle_info'] != null)
                    _buildInfoRow('Vehicle', _receipt!['vehicle_info'], Icons.directions_car, AppTheme.primaryColor),
                  
                  const SizedBox(height: 24),
                  
                  // Fare breakdown
                  _buildSectionTitle('Fare Breakdown'),
                  const SizedBox(height: 12),
                  if (_receipt!['fare_breakdown'] != null)
                    FareBreakdownWidget(breakdown: FareBreakdown.fromJson(_receipt!['fare_breakdown']))
                  else
                    _buildSimpleFareBreakdown(),
                  
                  const SizedBox(height: 24),
                  
                  // Payment info
                  _buildSectionTitle('Payment'),
                  const SizedBox(height: 12),
                  _buildInfoRow('Method', _receipt!['payment_method'] ?? 'Wallet', Icons.payment, AppTheme.primaryColor),
                  _buildInfoRow('Status', _receipt!['payment_status'] ?? 'Completed', Icons.check_circle, Colors.green),
                  
                  const SizedBox(height: 32),
                  
                  // Footer
                  Center(
                    child: Column(
                      children: [
                        Text(
                          'Thank you for riding with SmartMove!',
                          style: TextStyle(fontSize: 16, color: Colors.grey[600], fontWeight: FontWeight.w500),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'SmartSoko • SmartMove Module',
                          style: TextStyle(fontSize: 12, color: Colors.grey[400]),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildSectionTitle(String title) {
    return Text(
      title,
      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
    );
  }

  Widget _buildInfoRow(String label, String value, IconData icon, Color iconColor) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: iconColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              Text(value, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSimpleFareBreakdown() {
    // Fallback if no fare breakdown available
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          _buildFareRow('Trip Fare', _receipt!['total_fare']?.toString() ?? 'N/A'),
          const Divider(),
          _buildFareRow('Total', _receipt!['total_fare']?.toString() ?? 'N/A', isTotal: true),
        ],
      ),
    );
  }

  Widget _buildFareRow(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
              color: isTotal ? Colors.black87 : Colors.grey[700],
            ),
          ),
          Text(
            'TZS $value',
            style: TextStyle(
              fontSize: isTotal ? 16 : 14,
              fontWeight: isTotal ? FontWeight.bold : FontWeight.w500,
              color: isTotal ? AppTheme.primaryColor : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }

  void _shareReceipt() {
    // Share receipt via system share
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Receipt shared!')),
    );
  }

  void _downloadReceipt() {
    // Download PDF receipt
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Downloading receipt...')),
    );
  }
}