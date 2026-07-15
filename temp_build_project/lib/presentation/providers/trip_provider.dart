import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:temp_build_project/domain/entities/trip.dart';
import 'package:temp_build_project/domain/entities/location_data.dart';
import 'package:temp_build_project/domain/entities/driver.dart';

class TripState {
  final Trip? currentTrip;
  final List<Trip> trips;
  final bool isLoading;
  final String? error;

  const TripState({
    this.currentTrip,
    this.trips = const [],
    this.isLoading = false,
    this.error,
  });

  TripState copyWith({
    Trip? currentTrip,
    List<Trip>? trips,
    bool? isLoading,
    String? error,
  }) {
    return TripState(
      currentTrip: currentTrip ?? this.currentTrip,
      trips: trips ?? this.trips,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class TripNotifier extends StateNotifier<TripState> {
  TripNotifier() : super(const TripState());

  Future<double> estimatePrice(
    LocationData pickup,
    LocationData dropoff,
    String serviceTypeId,
  ) async {
    await Future.delayed(const Duration(seconds: 1));
    return 25.50;
  }

  Future<Trip> createTrip(
    LocationData pickup,
    LocationData dropoff,
    String serviceTypeId,
    String paymentMethod,
  ) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(seconds: 2));
      final trip = Trip(
        id: 'trip_${DateTime.now().millisecondsSinceEpoch}',
        userId: 'user_1',
        pickupLocation: pickup,
        dropoffLocation: dropoff,
        pickupAddress: pickup.address,
        dropoffAddress: dropoff.address,
        pickupLat: pickup.latitude,
        pickupLng: pickup.longitude,
        dropoffLat: dropoff.latitude,
        dropoffLng: dropoff.longitude,
        serviceType: serviceTypeId,
        status: TripStatus.searching,
        estimatedPrice: 25.50,
        estimatedDistance: 10.5,
        estimatedDuration: 15.0,
        paymentMethod: paymentMethod,
        createdAt: DateTime.now(),
      );
      state = state.copyWith(currentTrip: trip, isLoading: false);
      return trip;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
      rethrow;
    }
  }

  Future<void> cancelTrip(String id) async {
    state = state.copyWith(isLoading: true);
    try {
      await Future.delayed(const Duration(seconds: 1));
      if (state.currentTrip != null && state.currentTrip!.id == id) {
        state = state.copyWith(
          currentTrip: state.currentTrip!.copyWith(status: TripStatus.cancelled),
          isLoading: false,
        );
      } else {
        state = state.copyWith(isLoading: false);
      }
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> fetchTrips() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(seconds: 1));
      final now = DateTime.now();
      state = state.copyWith(
        trips: [
          Trip(
            id: 'trip_1',
            userId: 'user_1',
            pickupLocation: const LocationData(
              id: 'loc_1',
              address: '123 Main St, New York, NY',
              latitude: 40.7128,
              longitude: -74.0060,
              label: 'Home',
            ),
            dropoffLocation: const LocationData(
              id: 'loc_2',
              address: '456 Broadway, New York, NY',
              latitude: 40.7580,
              longitude: -73.9855,
              label: 'Office',
            ),
            pickupAddress: '123 Main St, New York, NY',
            dropoffAddress: '456 Broadway, New York, NY',
            pickupLat: 40.7128,
            pickupLng: -74.0060,
            dropoffLat: 40.7580,
            dropoffLng: -73.9855,
            serviceType: 'eco_1',
            driver: Driver(
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
            status: TripStatus.completed,
            estimatedPrice: 25.50,
            finalPrice: 24.80,
            estimatedDistance: 10.5,
            estimatedDuration: 15.0,
            paymentMethod: 'wallet',
            createdAt: now.subtract(const Duration(days: 1)),
            startedAt: now.subtract(const Duration(days: 1)).add(const Duration(minutes: 5)),
            completedAt: now.subtract(const Duration(days: 1)).add(const Duration(minutes: 25)),
          ),
          Trip(
            id: 'trip_2',
            userId: 'user_1',
            pickupLocation: const LocationData(
              id: 'loc_3',
              address: '789 Park Ave, New York, NY',
              latitude: 40.7712,
              longitude: -73.9632,
            ),
            dropoffLocation: const LocationData(
              id: 'loc_4',
              address: '321 5th Ave, New York, NY',
              latitude: 40.7484,
              longitude: -73.9856,
            ),
            pickupAddress: '789 Park Ave, New York, NY',
            dropoffAddress: '321 5th Ave, New York, NY',
            pickupLat: 40.7712,
            pickupLng: -73.9632,
            dropoffLat: 40.7484,
            dropoffLng: -73.9856,
            serviceType: 'xl_1',
            status: TripStatus.completed,
            estimatedPrice: 35.00,
            finalPrice: 34.50,
            estimatedDistance: 8.2,
            estimatedDuration: 12.0,
            paymentMethod: 'cash',
            createdAt: now.subtract(const Duration(days: 3)),
            startedAt: now.subtract(const Duration(days: 3)).add(const Duration(minutes: 3)),
            completedAt: now.subtract(const Duration(days: 3)).add(const Duration(minutes: 20)),
          ),
        ],
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void updateDriverLocation(double lat, double lng) {
    if (state.currentTrip != null) {
      state = state.copyWith(
        currentTrip: state.currentTrip!.copyWith(
          driverLatitude: lat,
          driverLongitude: lng,
        ),
      );
    }
  }

  void updateTripStatus(TripStatus status) {
    if (state.currentTrip != null) {
      state = state.copyWith(
        currentTrip: state.currentTrip!.copyWith(status: status),
      );
    }
  }
}

final tripProvider = StateNotifierProvider<TripNotifier, TripState>((ref) {
  return TripNotifier();
});
