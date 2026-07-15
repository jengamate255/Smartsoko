import '../entities/trip.dart';

abstract class TripRepository {
  Future<Trip> createTrip({
    required String pickupAddress,
    required String dropoffAddress,
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required String serviceType,
    String? promoCode,
  });
  Future<Trip> getActiveTrip();
  Future<List<Trip>> getTripHistory({int page, int pageSize});
  Future<Trip> getTripById(String tripId);
  Future<Map<String, dynamic>> estimatePrice({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    String? serviceType,
  });
  Future<void> cancelTrip(String tripId, {String? reason});
  Future<void> rateTrip(String tripId, {required int rating, String? comment});
}
