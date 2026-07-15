import 'package:dio/dio.dart';

import '../../core/constants/api_constants.dart';
import '../../core/errors/exceptions.dart';
import '../../core/network/api_client.dart';

class WalletRemoteDataSource {
  final ApiClient _apiClient;

  WalletRemoteDataSource(this._apiClient);

  Future<Map<String, dynamic>> getBalance() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.walletBalance);
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to fetch wallet balance',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<List<Map<String, dynamic>>> getTransactions({
    int page = 1,
    int pageSize = 20,
  }) async {
    try {
      final response = await _apiClient.dio.get(
        ApiConstants.walletTransactions,
        queryParameters: {'page': page, 'page_size': pageSize},
      );
      final data = response.data as Map<String, dynamic>;
      final list = data['data'] as List<dynamic>;
      return list.cast<Map<String, dynamic>>();
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to fetch transactions',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<Map<String, dynamic>> topUp({
    required double amount,
    required String paymentMethodId,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.walletTopUp,
        data: {
          'amount': amount,
          'payment_method_id': paymentMethodId,
        },
      );
      return response.data as Map<String, dynamic>;
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Top-up failed',
        statusCode: e.response?.statusCode,
      );
    }
  }
}
