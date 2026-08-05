import 'package:flutter/material.dart';
import '../../utils/app_theme.dart';

class RideStatusIndicator extends StatelessWidget {
  final dynamic status;
  final dynamic ride;
  final dynamic rideRequest;
  final dynamic driverLocation;

  const RideStatusIndicator({
    super.key,
    required this.status,
    this.ride,
    this.rideRequest,
    this.driverLocation,
  });

  @override
  Widget build(BuildContext context) {
    final steps = _buildStatusSteps();
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          _getStatusText(),
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 4),
        Text(
          _getSubtitleText(),
          style: TextStyle(fontSize: 13, color: Colors.grey[600]),
        ),
        const SizedBox(height: 20),
        ...steps,
      ],
    );
  }

  int _statusIndex() {
    const indices = {
      'searching': 0, 'driver_assigned': 1, 'driver_en_route': 2,
      'driver_arrived': 3, 'in_progress': 4, 'completed': 5,
    };
    return indices[status.toString()] ?? -1;
  }

  List<Widget> _buildStatusSteps() {
    final currentIdx = _statusIndex();
    final stepNames = ['searching', 'driver_assigned', 'driver_en_route', 'driver_arrived', 'in_progress', 'completed'];
    final stepLabels = [
      'Driver searching', 'Driver assigned', 'Driver en route',
      'Driver arrived', 'Ride in progress', 'Completed',
    ];
    final stepIcons = [
      Icons.search, Icons.person, Icons.directions_car,
      Icons.location_on, Icons.navigation, Icons.check_circle,
    ];

    return List.generate(stepNames.length, (i) {
      final isPast = i < currentIdx;
      final isActive = i == currentIdx;
      final isLast = i == stepNames.length - 1;
      return _buildStepRow(stepLabels[i], stepIcons[i], isPast, isActive, isLast);
    });
  }

  Widget _buildStepRow(String label, IconData icon, bool isPast, bool isActive, bool isLast) {
    final isFuture = !isPast && !isActive;
    
    return IntrinsicHeight(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Column(
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: isActive ? AppTheme.primaryColor : 
                         isFuture ? Colors.grey[300] : 
                         Colors.green,
                  shape: BoxShape.circle,
                  border: isFuture ? Border.all(color: Colors.grey[400]!, width: 2) : null,
                ),
                child: Icon(
                  isActive ? Icons.circle : icon,
                  size: isActive ? 12 : 14,
                  color: Colors.white,
                ),
              ),
              if (!isLast)
                Expanded(
                  child: Container(
                    width: 2,
                    color: isFuture ? Colors.grey[300] : 
                           isActive ? AppTheme.primaryColor : 
                           Colors.green,
                  ),
                ),
            ],
          ),
          const SizedBox(width: 12),
          Padding(
            padding: EdgeInsets.only(bottom: isLast ? 0 : 20),
            child: Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w400,
                color: isFuture ? Colors.grey[400] : 
                       isActive ? Colors.black87 : 
                       Colors.green[700],
              ),
            ),
          ),
        ],
      ),
    );
  }



  String _getStatusText() {
    switch (status.toString()) {
      case 'searching': return 'Finding your driver';
      case 'driver_assigned': return 'Driver on the way';
      case 'driver_en_route': return 'Driver is coming';
      case 'driver_arrived': return 'Driver has arrived';
      case 'in_progress': return 'On your way';
      case 'completed': return 'Trip completed';
      case 'cancelled': return 'Trip cancelled';
      default: return 'Ride status';
    }
  }

  String _getSubtitleText() {
    switch (status.toString()) {
      case 'searching': return 'Looking for nearby drivers';
      case 'driver_assigned': return 'Driver is heading to your location';
      case 'driver_en_route': return '${driverLocation != null ? "ETA: ${3} min" : "Heading to pickup"}';
      case 'driver_arrived': return 'Please come to the pickup point';
      case 'in_progress': return 'Enjoy your ride!';
      case 'completed': return 'Thank you for riding with SmartMove';
      case 'cancelled': return 'This ride has been cancelled';
      default: return '';
    }
  }
}