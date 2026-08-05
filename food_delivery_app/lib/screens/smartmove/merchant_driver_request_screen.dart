import 'dart:math';
import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../../utils/app_theme.dart';

class MerchantDriverRequestScreen extends StatefulWidget {
  final String orderId;
  final String customerId;
  final String customerAddress;
  final double customerLatitude;
  final double customerLongitude;
  final String merchantId;
  final String merchantName;
  final String merchantAddress;
  final double merchantLatitude;
  final double merchantLongitude;

  const MerchantDriverRequestScreen({
    super.key,
    required this.orderId,
    required this.customerId,
    required this.customerAddress,
    required this.customerLatitude,
    required this.customerLongitude,
    required this.merchantId,
    required this.merchantName,
    required this.merchantAddress,
    required this.merchantLatitude,
    required this.merchantLongitude,
  });

  @override
  State<MerchantDriverRequestScreen> createState() => _MerchantDriverRequestScreenState();
}

class _MerchantDriverRequestScreenState extends State<MerchantDriverRequestScreen> {
  final _supabaseService = SupabaseService();
  bool _isSearching = false;
  bool _driverFound = false;
  String? _assignedDriverId;
  String? _driverName;
  int? _driverEtaMinutes;
  String? _error;

  Future<void> _requestDriver() async {
    setState(() {
      _isSearching = true;
      _error = null;
    });

    try {
      final client = _supabaseService.client;

      // Create a ride request from merchant to customer
      final rideRequestResponse = await client.from('ride_requests').insert({
        'customer_id': widget.merchantId, // Merchant acts as customer
        'vehicle_type_id': await _getDefaultVehicleType(),
        'pickup_latitude': widget.merchantLatitude,
        'pickup_longitude': widget.merchantLongitude,
        'pickup_address': widget.merchantAddress,
        'dropoff_latitude': widget.customerLatitude,
        'dropoff_longitude': widget.customerLongitude,
        'dropoff_address': widget.customerAddress,
        'estimated_distance_km': _calculateDistance(
          widget.merchantLatitude, widget.merchantLongitude,
          widget.customerLatitude, widget.customerLongitude,
        ),
        'payment_method': 'wallet',
        'payment_status': 'pending',
        'status': 'searching',
        'metadata': {
          'order_id': widget.orderId,
          'merchant_id': widget.merchantId,
          'merchant_name': widget.merchantName,
          'customer_id': widget.customerId,
          'delivery_type': 'merchant_delivery',
        },
      }).select().single();

      // Add to matching queue
      await client.functions.invoke('smartmove-matching-engine', body: {
        'action': 'auto_assign',
        'ride_request_id': rideRequestResponse['id'],
      });

      // Poll for driver assignment
      _pollForDriver(rideRequestResponse['id']);
    } catch (e) {
      setState(() {
        _error = 'Failed to request driver: $e';
        _isSearching = false;
      });
    }
  }

  Future<String?> _getDefaultVehicleType() async {
    final response = await _supabaseService.client
        .from('vehicle_types')
        .select('id')
        .eq('name', 'bajaj')
        .maybeSingle();
    return response?['id'] as String?;
  }

  double _calculateDistance(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371;
    final dLat = (lat2 - lat1) * (3.14159265 / 180);
    final dLon = (lon2 - lon1) * (3.14159265 / 180);
    final a = sin(dLat / 2) * sin(dLat / 2) +
        cos(lat1 * (3.14159265 / 180)) *
        cos(lat2 * (3.14159265 / 180)) *
        sin(dLon / 2) * sin(dLon / 2);
    final c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return R * c;
  }

  void _pollForDriver(String rideRequestId) {
    // Poll every 5 seconds for driver assignment
    Future.doWhile(() async {
      await Future.delayed(const Duration(seconds: 5));
      if (!mounted) return false;

      final response = await _supabaseService.client
          .from('ride_requests')
          .select('status, assigned_driver_id, driver_accepted_at')
          .eq('id', rideRequestId)
          .single();

      final status = response['status'] as String;
      
      if (status == 'driver_assigned' || status == 'driver_en_route') {
        if (mounted) {
          setState(() {
            _isSearching = false;
            _driverFound = true;
            _assignedDriverId = response['assigned_driver_id'] as String?;
          });
        }
        return false; // Stop polling
      }
      
      if (status == 'no_drivers_found' || status == 'expired') {
        if (mounted) {
          setState(() {
            _isSearching = false;
            _error = 'No drivers available. Please try again.';
          });
        }
        return false; // Stop polling
      }

      return true; // Continue polling
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Request Delivery Driver'),
        backgroundColor: AppTheme.primaryColor,
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Order info
            Card(
              elevation: 2,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppTheme.primaryColor.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Icon(Icons.shopping_bag, color: AppTheme.primaryColor, size: 24),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('Delivery Request', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                              Text('Order #${widget.orderId.substring(0, 8).toUpperCase()}', style: TextStyle(color: Colors.grey[600])),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            
            const SizedBox(height: 24),
            
            // Route info
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Column(
                  children: [
                    Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        color: Colors.green,
                        shape: BoxShape.circle,
                      ),
                    ),
                    Container(
                      width: 2,
                      height: 60,
                      color: Colors.grey[300],
                    ),
                    Container(
                      width: 12,
                      height: 12,
                      decoration: const BoxDecoration(
                        color: Colors.red,
                        shape: BoxShape.circle,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('From (Merchant)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text(widget.merchantName, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
                      Text(widget.merchantAddress, style: TextStyle(color: Colors.grey[500], fontSize: 12)),
                      const SizedBox(height: 24),
                      const Text('To (Customer)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 4),
                      Text(widget.customerAddress, style: TextStyle(color: Colors.grey[600], fontSize: 14)),
                    ],
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 32),
            
            // Driver status
            if (_isSearching) ...[
              const Center(
                child: Column(
                  children: [
                    SizedBox(
                      width: 60,
                      height: 60,
                      child: CircularProgressIndicator(strokeWidth: 4),
                    ),
                    SizedBox(height: 16),
                    Text('Searching for nearby driver...', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w500)),
                    SizedBox(height: 8),
                    Text('This usually takes a few seconds', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            ] else if (_driverFound) ...[
              Card(
                elevation: 3,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                color: Colors.green[50],
                child: Padding(
                  padding: const EdgeInsets.all(20),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.green,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(Icons.check, color: Colors.white, size: 32),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Driver Found!', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.green)),
                            const SizedBox(height: 4),
                            Text('Driver is on the way to collect the order', style: TextStyle(color: Colors.grey[600], fontSize: 14)),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton.icon(
                  onPressed: () => Navigator.pop(context),
                  icon: const Icon(Icons.route),
                  label: const Text('Track Delivery'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              ),
            ] else ...[
              // Request button
              SizedBox(
                width: double.infinity,
                height: 56,
                child: ElevatedButton.icon(
                  onPressed: _requestDriver,
                  icon: const Icon(Icons.delivery_dining),
                  label: const Text('Request Driver', style: TextStyle(fontSize: 18)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    elevation: 2,
                  ),
                ),
              ),
            ],
            
            if (_error != null) ...[
              const SizedBox(height: 16),
              Card(
                color: Colors.red[50],
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline, color: Colors.red),
                      const SizedBox(width: 12),
                      Expanded(child: Text(_error!, style: TextStyle(color: Colors.red[700]))),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                width: double.infinity,
                height: 48,
                child: OutlinedButton(
                  onPressed: _requestDriver,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppTheme.primaryColor,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Try Again'),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

// Widget for integration inside merchant order management screen
class MerchantOrderDriverWidget extends StatelessWidget {
  final String orderId;
  final String customerId;
  final String customerAddress;
  final double customerLatitude;
  final double customerLongitude;
  final String merchantId;
  final String merchantName;
  final String merchantAddress;
  final double merchantLatitude;
  final double merchantLongitude;
  final String? assignedDriverId;
  final String? driverStatus;

  const MerchantOrderDriverWidget({
    super.key,
    required this.orderId,
    required this.customerId,
    required this.customerAddress,
    required this.customerLatitude,
    required this.customerLongitude,
    required this.merchantId,
    required this.merchantName,
    required this.merchantAddress,
    required this.merchantLatitude,
    required this.merchantLongitude,
    this.assignedDriverId,
    this.driverStatus,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.delivery_dining, color: AppTheme.primaryColor),
                const SizedBox(width: 8),
                const Text('Delivery', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                const Spacer(),
                if (assignedDriverId != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green[50],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(driverStatus ?? 'In Transit', style: TextStyle(fontSize: 12, color: Colors.green[700])),
                  )
                else
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.orange[50],
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text('Pending', style: TextStyle(fontSize: 12, color: Colors.orange[700])),
                  ),
              ],
            ),
            const SizedBox(height: 12),
            if (assignedDriverId == null)
              SizedBox(
                width: double.infinity,
                child: ElevatedButton.icon(
                  onPressed: () {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (_) => MerchantDriverRequestScreen(
                          orderId: orderId,
                          customerId: customerId,
                          customerAddress: customerAddress,
                          customerLatitude: customerLatitude,
                          customerLongitude: customerLongitude,
                          merchantId: merchantId,
                          merchantName: merchantName,
                          merchantAddress: merchantAddress,
                          merchantLatitude: merchantLatitude,
                          merchantLongitude: merchantLongitude,
                        ),
                      ),
                    );
                  },
                  icon: const Icon(Icons.local_shipping),
                  label: const Text('Request Driver'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppTheme.primaryColor,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
              )
            else ...[
              Row(
                children: [
                  Icon(Icons.person, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text('Driver assigned', style: TextStyle(color: Colors.grey[600])),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.track_changes, color: AppTheme.primaryColor, size: 20),
                    onPressed: () {}, // Track
                    tooltip: 'Track Driver',
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}