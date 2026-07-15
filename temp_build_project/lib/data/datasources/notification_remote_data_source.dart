import 'package:dio/dio.dart';

import '../../core/constants/api_constants.dart';
import '../../core/errors/exceptions.dart';
import '../../core/network/api_client.dart';

class NotificationRemoteDataSource {
  final ApiClient _apiClient;

  NotificationRemoteDataSource(this._apiClient);

  Future<List<Map<String, dynamic>>> getNotifications({
    int page = 1,
    int pageSize = 20,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.notifications,
        queryParameters: {'page': page, 'page_size': pageSize},
      );
      final data = response.data as Map<String, dynamic>;
      final list = data['data'] as List<dynamic>;
      return list.cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to fetch notifications',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<int> getUnreadCount() async {
    try {
      final response = await _apiClient.dio.get(
        '${ApiConstants.notifications}/unread-count',
      );
      final data = response.data as Map<String, dynamic>;
      return (data['data'] is Map ? data['data']['count'] : data['data']) as int? ?? 0;
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to fetch unread count',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<void> markAsRead(String notificationId) async {
    try {
      await _apiClient.dio.patch(
        '${ApiConstants.notifications}/$notificationId/read',
      );
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to mark notification as read',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<void> markAllAsRead() async {
    try {
      await _apiClient.dio.patch('${ApiConstants.notifications}/read-all');
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to mark all as read',
        statusCode: e.response?.statusCode,
      );
    }
  }
}
