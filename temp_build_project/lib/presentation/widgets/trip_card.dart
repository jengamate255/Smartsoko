import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:temp_build_project/domain/entities/trip.dart';

class TripCard extends StatelessWidget {
  final Trip trip;
  final VoidCallback? onTap;

  const TripCard({
    super.key,
    required this.trip,
    this.onTap,
  });

  String _formatPrice(double price) {
    return '\$${price.toStringAsFixed(2)}';
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final diff = now.difference(date);
    if (diff.inDays == 0) return 'Today';
    if (diff.inDays == 1) return 'Yesterday';
    return DateFormat('MMM dd, yyyy').format(date);
  }

  IconData _statusIcon(TripStatus status) {
    switch (status) {
      case TripStatus.completed:
        return Icons.check_circle;
      case TripStatus.cancelled:
        return Icons.cancel;
      case TripStatus.inProgress:
        return Icons.directions_car;
      default:
        return Icons.schedule;
    }
  }

  Color _statusColor(TripStatus status) {
    switch (status) {
      case TripStatus.completed:
        return Colors.green;
      case TripStatus.cancelled:
        return Colors.red;
      case TripStatus.inProgress:
        return Colors.blue;
      default:
        return Colors.orange;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    _statusIcon(trip.status),
                    color: _statusColor(trip.status),
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Text(
                    _formatDate(trip.createdAt),
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade500,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    _formatPrice(trip.finalPrice ?? trip.estimatedPrice),
                    style: theme.textTheme.titleMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              _LocationRow(
                icon: Icons.circle,
                iconColor: Colors.green,
                address: trip.pickupLocation?.address ?? trip.pickupAddress,
              ),
              const SizedBox(height: 8),
              _LocationRow(
                icon: Icons.location_on,
                iconColor: Colors.red,
                address: trip.dropoffLocation?.address ?? trip.dropoffAddress,
              ),
              if (trip.driver != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    Icon(Icons.person_outline, size: 16, color: Colors.grey.shade500),
                    const SizedBox(width: 6),
                    Text(
                      trip.driver!.name,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade600,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Icon(Icons.star, size: 16, color: Colors.amber.shade600),
                    const SizedBox(width: 4),
                    Text(
                      trip.driver!.rating.toString(),
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: Colors.grey.shade600,
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
}

class _LocationRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String address;

  const _LocationRow({
    required this.icon,
    required this.iconColor,
    required this.address,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 12, color: iconColor),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            address,
            style: Theme.of(context).textTheme.bodyMedium,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}
