import 'package:dio/dio.dart';

import '../../core/constants/api_constants.dart';
import '../../core/errors/exceptions.dart';
import '../../core/network/api_client.dart';

class LocationRemoteDataSource {
  final ApiClient _apiClient;

  LocationRemoteDataSource(this._apiClient);

  Future<List<Map<String, dynamic>>> getSavedPlaces() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.savedPlaces);
      final data = response.data as Map<String, dynamic>;
      final list = data['data'] as List<dynamic>;
      return list.cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to fetch saved places',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<Map<String, dynamic>> savePlace({
    required String name,
    required String address,
    required double lat,
    required double lng,
    String? type,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.savedPlaces,
        data: {
          'name': name,
          'address': address,
          'lat': lat,
          'lng': lng,
          if (type != null) 'type': type,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to save place',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<void> deletePlace(String placeId) async {
    try {
      await _apiClient.dio.delete('${ApiConstants.savedPlaces}/$placeId');
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to delete place',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<List<Map<String, dynamic>>> getNearbyDrivers({
    required double lat,
    required double lng,
    double radiusKm = 5.0,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.nearbyDrivers,
        queryParameters: {
          'lat': lat,
          'lng': lng,
          'radius': radiusKm,
        },
      );
      final data = response.data as Map<String, dynamic>;
      final list = data['data'] as List<dynamic>;
      return list.cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to fetch nearby drivers',
        statusCode: e.response?.statusCode,
      );
    }
  }
}
