import 'package:flutter/material.dart';
import '../../models/smartmove/ride_request.dart';
import '../../utils/app_theme.dart';

class DriverCard extends StatelessWidget {
  final String driverName;
  final double driverRating;
  final String vehicleInfo;
  final String vehiclePlate;
  final VoidCallback onCall;
  final VoidCallback onChat;

  const DriverCard({
    super.key,
    required this.driverName,
    required this.driverRating,
    required this.vehicleInfo,
    required this.vehiclePlate,
    required this.onCall,
    required this.onChat,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        // Driver avatar
        CircleAvatar(
          radius: 28,
          backgroundColor: AppTheme.primaryColor.withOpacity(0.1),
          child: const Icon(Icons.person, color: AppTheme.primaryColor, size: 28),
        ),
        const SizedBox(width: 16),
        
        // Driver info
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Text(
                    driverName,
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(width: 8),
                  Icon(Icons.star, color: Colors.amber, size: 16),
                  Text(
                    driverRating.toStringAsFixed(1),
                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w500),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                '$vehicleInfo • $vehiclePlate',
                style: TextStyle(color: Colors.grey[600], fontSize: 13),
              ),
            ],
          ),
        ),
        
        // Action buttons
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              decoration: BoxDecoration(
                color: Colors.green[50],
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.phone, color: Colors.green, size: 20),
                onPressed: onCall,
                tooltip: 'Call Driver',
              ),
            ),
            const SizedBox(width: 8),
            Container(
              decoration: BoxDecoration(
                color: AppTheme.primaryColor.withOpacity(0.1),
                shape: BoxShape.circle,
              ),
              child: IconButton(
                icon: const Icon(Icons.chat, color: AppTheme.primaryColor, size: 20),
                onPressed: onChat,
                tooltip: 'Chat with Driver',
              ),
            ),
          ],
        ),
      ],
    );
  }
}

class ETACard extends StatelessWidget {
  final String label;
  final double distance;
  final int duration;
  final Color iconColor;

  const ETACard({
    super.key,
    required this.label,
    required this.distance,
    required this.duration,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      color: Colors.grey[50],
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: iconColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(Icons.timer_outlined, color: iconColor, size: 18),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(fontSize: 11, color: Colors.grey[600]),
                ),
                Text(
                  '$duration min',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                ),
                Text(
                  '${distance.toStringAsFixed(1)} km',
                  style: TextStyle(fontSize: 11, color: Colors.grey[500]),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class OnlineStatusToggle extends StatelessWidget {
  final bool isOnline;
  final ValueChanged<bool> onToggle;

  const OnlineStatusToggle({
    super.key,
    required this.isOnline,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SwitchListTile(
        title: Text(
          isOnline ? 'You are online' : 'You are offline',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            fontSize: 16,
            color: isOnline ? Colors.green[700] : Colors.grey[600],
          ),
        ),
        subtitle: Text(
          isOnline ? 'Receiving ride requests' : 'Tap to go online',
          style: TextStyle(fontSize: 12, color: Colors.grey[500]),
        ),
        value: isOnline,
        activeColor: Colors.green,
        onChanged: onToggle,
        secondary: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: isOnline ? Colors.green[50] : Colors.grey[100],
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(
            isOnline ? Icons.wifi : Icons.wifi_off,
            color: isOnline ? Colors.green : Colors.grey,
            size: 24,
          ),
        ),
      ),
    );
  }
}

class FareBreakdownWidget extends StatelessWidget {
  final dynamic breakdown;

  const FareBreakdownWidget({super.key, required this.breakdown});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.grey[50],
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          if (breakdown.baseFare > 0) _buildRow('Base fare', breakdown.formattedBaseFare),
          if (breakdown.distanceFare > 0) _buildRow('Distance', breakdown.formattedDistanceFare),
          if (breakdown.timeFare > 0) _buildRow('Time', breakdown.formattedTimeFare),
          if (breakdown.waitingFare > 0) _buildRow('Waiting', breakdown.formattedWaitingFare),
          if (breakdown.airportFee > 0) _buildRow('Airport fee', breakdown.formattedAirportFee),
          if (breakdown.nightSurcharge > 0) _buildRow('Night surcharge', breakdown.formattedNightSurcharge),
          if (breakdown.peakSurcharge > 0) _buildRow('Peak surcharge', breakdown.formattedPeakSurcharge),
          if (breakdown.promoDiscount > 0) _buildRow('Promo discount', '-${_format(breakdown.promoDiscount)}', Colors.green),
          const Divider(),
          _buildRow('Platform fee', '-${_format(breakdown.platformFee)}', Colors.grey[600]),
          const Divider(thickness: 2),
          _buildRow('Total', breakdown.formattedTotalFare, null, true),
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value, [Color? color, bool bold = false]) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: color ?? Colors.grey[700], fontWeight: bold ? FontWeight.bold : FontWeight.w500, fontSize: bold ? 15 : 13)),
          Text(value, style: TextStyle(color: color ?? Colors.black87, fontWeight: bold ? FontWeight.bold : FontWeight.w600, fontSize: bold ? 15 : 13)),
        ],
      ),
    );
  }

  String _format(int amount) {
    return 'TZS ${amount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }
}

class DriverRideCard extends StatelessWidget {
  final RideRequest rideRequest;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const DriverRideCard({
    super.key,
    required this.rideRequest,
    required this.onAccept,
    required this.onReject,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green[50],
                    borderRadius: BorderRadius.circular(8),
                  ),
                    child: Text(
                    'Ride Request',
                    style: TextStyle(fontSize: 12, color: Colors.green[700], fontWeight: FontWeight.w600),
                  ),
                ),
                const Spacer(),
                Text(
                  'TZS ${rideRequest.estimatedFare?.toString() ?? '?'}',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.primaryColor),
                ),
              ],
            ),
            const SizedBox(height: 12),
            // Pickup
            Row(
              children: [
                Icon(Icons.circle, color: Colors.green, size: 12),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    rideRequest.pickupAddress,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            // Dropoff
            Row(
              children: [
                Icon(Icons.location_on, color: Colors.red, size: 14),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    rideRequest.dropoffAddress,
                    style: const TextStyle(fontWeight: FontWeight.w500),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            if (rideRequest.estimatedDurationMinutes != null) ...[
              const SizedBox(height: 8),
              Text(
                '${rideRequest.estimatedDurationMinutes} min',
                style: TextStyle(fontSize: 12, color: Colors.grey[600]),
              ),
            ],
            const SizedBox(height: 12),
            const Divider(height: 1),
            const SizedBox(height: 12),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: onReject,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.red,
                      side: BorderSide(color: Colors.red[200]!),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Reject'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: onAccept,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppTheme.primaryColor,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('Accept'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}