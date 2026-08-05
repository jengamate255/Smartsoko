import 'package:flutter/material.dart';
import '../../models/smartmove/vehicle_type.dart';
import '../../utils/app_theme.dart';

class VehicleTypeCard extends StatelessWidget {
  final VehicleType vehicleType;
  final bool isSelected;
  final VoidCallback onTap;

  const VehicleTypeCard({
    super.key,
    required this.vehicleType,
    required this.isSelected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 120,
        margin: const EdgeInsets.only(right: 12),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primaryColor.withOpacity(0.1) : Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(
            color: isSelected ? AppTheme.primaryColor : Colors.grey[300]!,
            width: isSelected ? 2 : 1,
          ),
          boxShadow: isSelected
              ? [BoxShadow(color: AppTheme.primaryColor.withOpacity(0.2), blurRadius: 8)]
              : null,
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              _getVehicleIcon(vehicleType.name),
              color: isSelected ? AppTheme.primaryColor : Colors.grey,
              size: 32,
            ),
            const SizedBox(height: 8),
            Text(
              vehicleType.displayName,
              style: TextStyle(
                fontWeight: FontWeight.w600,
                fontSize: 14,
                color: isSelected ? AppTheme.primaryColor : Colors.black87,
              ),
            ),
            Text(
              vehicleType.formattedMinFare,
              style: TextStyle(
                fontSize: 11,
                color: isSelected ? AppTheme.primaryColor.withOpacity(0.7) : Colors.grey[600],
              ),
            ),
            const SizedBox(height: 4),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: isSelected ? AppTheme.primaryColor : Colors.grey[200],
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                vehicleType.formattedBaseFare,
                style: TextStyle(
                  fontSize: 10,
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  IconData _getVehicleIcon(String name) {
    switch (name) {
      case 'bajaj':
        return Icons.electric_rickshaw;
      case 'boda_boda':
        return Icons.two_wheeler;
      case 'sedan':
        return Icons.directions_car;
      case 'suv':
        return Icons.directions_car_filled;
      case 'van':
        return Icons.airport_shuttle;
      default:
        return Icons.directions_car;
    }
  }
}