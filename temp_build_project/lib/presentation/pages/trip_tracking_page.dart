import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:temp_build_project/domain/entities/trip.dart';
import 'package:temp_build_project/presentation/providers/trip_provider.dart';

class TripTrackingPage extends ConsumerWidget {
  final String tripId;

  const TripTrackingPage({super.key, required this.tripId});

  String _statusLabel(TripStatus status) {
    switch (status) {
      case TripStatus.searching:
        return 'Finding your driver...';
      case TripStatus.driverAssigned:
        return 'Driver assigned';
      case TripStatus.arriving:
        return 'Driver is arriving';
      case TripStatus.arrived:
        return 'Driver has arrived';
      case TripStatus.inProgress:
        return 'On your way';
      case TripStatus.completed:
        return 'Trip completed';
      case TripStatus.cancelled:
        return 'Trip cancelled';
      default:
        return 'Preparing your ride...';
    }
  }

  IconData _statusIcon(TripStatus status) {
    switch (status) {
      case TripStatus.searching:
        return Icons.search;
      case TripStatus.arriving:
      case TripStatus.arrived:
        return Icons.directions_car;
      case TripStatus.inProgress:
        return Icons.navigation;
      case TripStatus.completed:
        return Icons.check_circle;
      case TripStatus.cancelled:
        return Icons.cancel;
      default:
        return Icons.schedule;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final tripState = ref.watch(tripProvider);
    final trip = tripState.currentTrip;

    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new),
          onPressed: () => context.go('/home'),
        ),
        title: Text(_statusLabel(trip?.status ?? TripStatus.searching)),
        centerTitle: true,
      ),
      body: Column(
        children: [
          Expanded(
            flex: 3,
            child: Container(
              color: Colors.grey.shade200,
              child: Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.map, size: 64, color: Colors.grey.shade400),
                    const SizedBox(height: 8),
                    Text(
                      'Live Map',
                      style: TextStyle(color: Colors.grey.shade500),
                    ),
                  ],
                ),
              ),
            ),
          ),
          Expanded(
            flex: 2,
            child: Container(
              decoration: BoxDecoration(
                color: theme.scaffoldBackgroundColor,
                borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (trip?.status == TripStatus.searching)
                      _SearchingDriverCard()
                    else ...[
                      if (trip?.driver != null) _DriverInfoCard(driver: trip!.driver!),
                      const SizedBox(height: 16),
                    ],
                    if (trip != null) ...[
                      Row(
                        children: [
                          Icon(Icons.schedule, size: 16, color: Colors.grey.shade500),
                          const SizedBox(width: 6),
                          Text(
                            trip.etaMinutes != null
                                ? '${trip.etaMinutes} min away'
                                : 'Calculating ETA...',
                            style: theme.textTheme.bodyMedium?.copyWith(
                              color: Colors.grey.shade600,
                            ),
                          ),
                          const Spacer(),
                          Text(
                            '\$${trip.estimatedPrice.toStringAsFixed(2)}',
                            style: theme.textTheme.titleMedium?.copyWith(
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      _TripLocationRow(
                        icon: Icons.circle,
                        iconColor: Colors.green,
                        address: trip.pickupLocation?.address ?? trip.pickupAddress,
                      ),
                      const SizedBox(height: 12),
                      _TripLocationRow(
                        icon: Icons.location_on,
                        iconColor: Colors.red,
                        address: trip.dropoffLocation?.address ?? trip.dropoffAddress,
                      ),
                      const SizedBox(height: 24),
                      if (trip.status == TripStatus.searching ||
                          trip.status == TripStatus.driverAssigned ||
                          trip.status == TripStatus.arriving)
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: OutlinedButton(
                            onPressed: () {
                              ref.read(tripProvider.notifier).cancelTrip(trip.id);
                              context.go('/home');
                            },
                            style: OutlinedButton.styleFrom(
                              foregroundColor: Colors.red,
                              side: const BorderSide(color: Colors.red),
                            ),
                            child: const Text('Cancel Ride'),
                          ),
                        ),
                      if (trip.status == TripStatus.completed)
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            onPressed: () => context.go('/home'),
                            child: const Text('Back to Home'),
                          ),
                        ),
                    ],
                    const SizedBox(height: 16),
                    Row(
                      children: [
                        Expanded(
                          child: _ActionButton(
                            icon: Icons.chat_bubble_outline,
                            label: 'Chat',
                            onTap: () {},
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: _ActionButton(
                            icon: Icons.phone_outlined,
                            label: 'Call',
                            onTap: () {},
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchingDriverCard extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Column(
      children: [
        const SizedBox(
          width: 60,
          height: 60,
          child: CircularProgressIndicator(strokeWidth: 3),
        ),
        const SizedBox(height: 16),
        Text(
          'Finding your driver...',
          style: theme.textTheme.titleMedium?.copyWith(
            fontWeight: FontWeight.w600,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Please wait while we find a nearby driver',
          style: theme.textTheme.bodySmall?.copyWith(
            color: Colors.grey.shade500,
          ),
        ),
        const SizedBox(height: 16),
      ],
    );
  }
}

class _DriverInfoCard extends StatelessWidget {
  final dynamic driver;

  const _DriverInfoCard({required this.driver});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: Colors.grey.shade200,
              child: Icon(Icons.person, color: Colors.grey.shade500, size: 32),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    driver.name,
                    style: theme.textTheme.titleSmall?.copyWith(
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.star, size: 14, color: Colors.amber.shade600),
                      const SizedBox(width: 4),
                      Text(
                        '${driver.rating}',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade600,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${driver.totalTrips} trips',
                        style: theme.textTheme.bodySmall?.copyWith(
                          color: Colors.grey.shade500,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${driver.vehicleColor} ${driver.vehicleModel} • ${driver.vehiclePlate}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: Colors.grey.shade500,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _TripLocationRow extends StatelessWidget {
  final IconData icon;
  final Color iconColor;
  final String address;

  const _TripLocationRow({
    required this.icon,
    required this.iconColor,
    required this.address,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 14, color: iconColor),
        const SizedBox(width: 12),
        Expanded(
          child: Text(
            address,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;

  const _ActionButton({
    required this.icon,
    required this.label,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      onPressed: onTap,
      style: OutlinedButton.styleFrom(
        minimumSize: const Size(0, 48),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 18),
          const SizedBox(width: 6),
          Text(label),
        ],
      ),
    );
  }
}
