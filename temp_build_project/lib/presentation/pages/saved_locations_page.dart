import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:temp_build_project/presentation/providers/location_provider.dart';
import 'package:temp_build_project/presentation/widgets/empty_state.dart';

class SavedLocationsPage extends ConsumerStatefulWidget {
  const SavedLocationsPage({super.key});

  @override
  ConsumerState<SavedLocationsPage> createState() => _SavedLocationsPageState();
}

class _SavedLocationsPageState extends ConsumerState<SavedLocationsPage> {
  @override
  void initState() {
    super.initState();
    Future.microtask(() {
      ref.read(locationProvider.notifier).fetchSavedLocations();
    });
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final locationState = ref.watch(locationProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Saved Locations'),
        centerTitle: true,
      ),
      body: locationState.savedLocations.isEmpty
          ? const EmptyState(
              icon: Icons.location_on_outlined,
              title: 'No saved locations',
              subtitle: 'Save your home and work addresses for quick booking',
            )
          : ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: locationState.savedLocations.length + 1,
              itemBuilder: (context, index) {
                if (index == locationState.savedLocations.length) {
                  return Padding(
                    padding: const EdgeInsets.all(16),
                    child: OutlinedButton.icon(
                      onPressed: () {},
                      icon: const Icon(Icons.add),
                      label: const Text('Add New Location'),
                    ),
                  );
                }
                final loc = locationState.savedLocations[index];
                return ListTile(
                  leading: Container(
                    width: 44,
                    height: 44,
                    decoration: BoxDecoration(
                      color: loc.label == 'Home'
                          ? Colors.green.withValues(alpha: 0.1)
                          : Colors.blue.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      loc.label == 'Home' ? Icons.home : Icons.work,
                      color: loc.label == 'Home' ? Colors.green : Colors.blue,
                    ),
                  ),
                  title: Text(loc.label ?? 'Saved'),
                  subtitle: Text(loc.address, maxLines: 1, overflow: TextOverflow.ellipsis),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () {
                      ref.read(locationProvider.notifier).deleteLocation(loc.id);
                    },
                  ),
                );
              },
            ),
    );
  }
}
