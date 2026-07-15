import 'package:dio/dio.dart';

import '../../core/constants/api_constants.dart';
import '../../core/errors/exceptions.dart';
import '../../core/network/api_client.dart';
import '../models/trip_model.dart';

class TripRemoteDataSource {
  final ApiClient _apiClient;

  TripRemoteDataSource(this._apiClient);

  Future<TripModel> createTrip({
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
      final response = await _apiClient.dio.post(
        ApiConstants.trips,
        data: {
          'pickup_address': pickupAddress,
          'dropoff_address': dropoffAddress,
          'pickup_lat': pickupLat,
          'pickup_lng': pickupLng,
          'dropoff_lat': dropoffLat,
          'dropoff_lng': dropoffLng,
          'service_type': serviceType,
          if (promoCode != null) 'promo_code': promoCode,
        },
      );
      final data = response.data as Map<String, dynamic>;
      return TripModel.fromJson(data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to create trip',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<TripModel> getActiveTrip() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.activeTrip);
      final data = response.data as Map<String, dynamic>;
      return TripModel.fromJson(data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to get active trip',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<List<TripModel>> getTripHistory({int page = 1, int pageSize = 20}) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.trips,
        queryParameters: {'page': page, 'page_size': pageSize},
      );
      final data = response.data as Map<String, dynamic>;
      final list = data['data'] as List<dynamic>;
      return list
          .map((e) => TripModel.fromJson(e as Map<String, dynamic>))
          .toList();
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to fetch trip history',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<TripModel> getTripById(String tripId) async {
    try {
      final response = await _apiClient.dio.get('${ApiConstants.trips}/$tripId');
      final data = response.data as Map<String, dynamic>;
      return TripModel.fromJson(data['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to fetch trip details',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<Map<String, dynamic>> estimatePrice({
    required double pickupLat,
    required double pickupLng,
    required double dropoffLat,
    required double dropoffLng,
    String? serviceType,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.tripEstimate,
        data: {
          'pickup_lat': pickupLat,
          'pickup_lng': pickupLng,
          'dropoff_lat': dropoffLat,
          'dropoff_lng': dropoffLng,
          if (serviceType != null) 'service_type': serviceType,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to estimate price',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<void> cancelTrip(String tripId, {String? reason}) async {
    try {
      await _apiClient.dio.patch(
        '${ApiConstants.trips}/$tripId${ApiConstants.tripCancel}',
        data: {'reason': reason ?? 'Cancelled by user'},
      );
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to cancel trip',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<void> rateTrip(String tripId, {required int rating, String? comment}) async {
    try {
      await _apiClient.dio.post(
        '${ApiConstants.trips}/$tripId${ApiConstants.tripRate}',
        data: {'rating': rating, if (comment != null) 'comment': comment},
      );
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to rate trip',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Stream<TripModel> streamTripUpdates(String tripId) {
    // API polling implementation; real-time would use WebSocket
    throw UnimplementedError('Use WebSocket for real-time updates');
  }
}
