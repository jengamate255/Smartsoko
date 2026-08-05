import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:temp_build_project/presentation/providers/trip_provider.dart';
import 'package:temp_build_project/presentation/widgets/trip_card.dart';
import 'package:temp_build_project/presentation/widgets/empty_state.dart';
import 'package:temp_build_project/presentation/widgets/error_display.dart';

class TripHistoryPage extends ConsumerStatefulWidget {
  const TripHistoryPage({super.key});

  @override
  ConsumerState<TripHistoryPage> createState() => _TripHistoryPageState();
}

class _TripHistoryPageState extends ConsumerState<TripHistoryPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(tripProvider.notifier).fetchTrips();
    });
  }

  Future<void> _refresh() async {
    await ref.read(tripProvider.notifier).fetchTrips();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final tripState = ref.watch(tripProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Your Trips'),
        centerTitle: true,
      ),
      body: tripState.isLoading && tripState.trips.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : tripState.error != null && tripState.trips.isEmpty
              ? ErrorDisplay(
                  message: tripState.error!,
                  onRetry: _refresh,
                )
              : tripState.trips.isEmpty
                  ? EmptyState(
                      icon: Icons.directions_car_outlined,
                      title: 'No trips yet',
                      subtitle: 'Your trip history will appear here',
                    )
                  : RefreshIndicator(
                      onRefresh: _refresh,
                      child: ListView.builder(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: tripState.trips.length,
                        itemBuilder: (context, index) {
                          final trip = tripState.trips[index];
                          return TripCard(
                            trip: trip,
                            onTap: () {},
                          );
                        },
                      ),
                    ),
    );
  }
}
