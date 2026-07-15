import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:temp_build_project/domain/entities/location_data.dart';
import 'package:temp_build_project/domain/entities/driver.dart';

class LocationState {
  final LocationData? currentLocation;
  final List<LocationData> savedLocations;
  final List<Driver> nearbyDrivers;
  final bool isLoading;
  final String? error;

  const LocationState({
    this.currentLocation,
    this.savedLocations = const [],
    this.nearbyDrivers = const [],
    this.isLoading = false,
    this.error,
  });

  LocationState copyWith({
    LocationData? currentLocation,
    List<LocationData>? savedLocations,
    List<Driver>? nearbyDrivers,
    bool? isLoading,
    String? error,
  }) {
    return LocationState(
      currentLocation: currentLocation ?? this.currentLocation,
      savedLocations: savedLocations ?? this.savedLocations,
      nearbyDrivers: nearbyDrivers ?? this.nearbyDrivers,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class LocationNotifier extends StateNotifier<LocationState> {
  LocationNotifier() : super(const LocationState());

  Future<void> getCurrentLocation() async {
    state = state.copyWith(isLoading: true);
    try {
      await Future.delayed(const Duration(seconds: 1));
      state = state.copyWith(
        currentLocation: const LocationData(
          id: 'current',
          address: 'Current Location',
          latitude: 40.7128,
          longitude: -74.0060,
        ),
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> fetchSavedLocations() async {
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      state = state.copyWith(
        savedLocations: const [
          LocationData(
            id: 'home',
            address: '123 Main St, New York, NY 10001',
            latitude: 40.7128,
            longitude: -74.0060,
            label: 'Home',
          ),
          LocationData(
            id: 'work',
            address: '456 Broadway, New York, NY 10013',
            latitude: 40.7580,
            longitude: -73.9855,
            label: 'Work',
          ),
        ],
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> saveLocation(LocationData location) async {
    final updated = List<LocationData>.from(state.savedLocations);
    updated.add(location);
    state = state.copyWith(savedLocations: updated);
  }

  Future<void> deleteLocation(String id) async {
    final updated = state.savedLocations.where((loc) => loc.id != id).toList();
    state = state.copyWith(savedLocations: updated);
  }

  Future<void> fetchNearbyDrivers() async {
    try {
      await Future.delayed(const Duration(seconds: 1));
      state = state.copyWith(
        nearbyDrivers: const [
          Driver(
            id: 'driver_1',
            name: 'Mike Smith',
            phone: '+1234567890',
            rating: 4.8,
            totalTrips: 1250,
            vehicleModel: 'Toyota Camry',
            vehicleColor: 'White',
            vehiclePlate: 'ABC-1234',
            vehicleYear: '2022',
          ),
          Driver(
            id: 'driver_2',
            name: 'Sarah Johnson',
            phone: '+1234567891',
            rating: 4.9,
            totalTrips: 2300,
            vehicleModel: 'Honda Accord',
            vehicleColor: 'Black',
            vehiclePlate: 'XYZ-5678',
            vehicleYear: '2023',
          ),
        ],
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  void updateCurrentLocation(LocationData location) {
    state = state.copyWith(currentLocation: location);
  }
}

final locationProvider = StateNotifierProvider<LocationNotifier, LocationState>((ref) {
  return LocationNotifier();
});
