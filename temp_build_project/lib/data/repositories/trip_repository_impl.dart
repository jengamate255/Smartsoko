import '../../core/errors/exceptions.dart';
import '../../domain/entities/trip.dart';
import '../../domain/repositories/trip_repository.dart';
import '../datasources/trip_remote_data_source.dart';

class TripRepositoryImpl implements TripRepository {
  final TripRemoteDataSource _remoteDataSource;

  TripRepositoryImpl(this._remoteDataSource);

  @override
  Future<Trip> createTrip({
    required String pickupAddress,
    required String dropoffAddress,
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    required String serviceType,
    String? promoCode,
  }) async {
    try {
      return await _remoteDataSource.createTrip(
        pickupAddress: pickupAddress,
        dropoffAddress: dropoffAddress,
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        dropoffLat: dropoffLat,
        dropoffLng: dropoffLng,
        serviceType: serviceType,
        promoCode: promoCode,
      );
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<Trip> getActiveTrip() async {
    try {
      return await _remoteDataSource.getActiveTrip();
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<List<Trip>> getTripHistory({
    int page = 1,
    int pageSize = 20,
  }) async {
    try {
      return await _remoteDataSource.getTripHistory(
        page: page,
        pageSize: pageSize,
      );
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<Trip> getTripById(String tripId) async {
    try {
      return await _remoteDataSource.getTripById(tripId);
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<Map<String, dynamic>> estimatePrice({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    String? serviceType,
  }) async {
    try {
      return await _remoteDataSource.estimatePrice(
        pickupLat: pickupLat,
        pickupLng: pickupLng,
        dropoffLat: dropoffLat,
        dropoffLng: dropoffLng,
        serviceType: serviceType,
      );
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> cancelTrip(String tripId, {String? reason}) async {
    try {
      await _remoteDataSource.cancelTrip(tripId, reason: reason);
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> rateTrip(String tripId, {
    required int rating,
    String? comment,
  }) async {
    try {
      await _remoteDataSource.rateTrip(tripId, rating: rating, comment: comment);
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }
}
