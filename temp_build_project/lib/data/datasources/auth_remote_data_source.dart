import 'package:dio/dio.dart';

import '../../core/constants/api_constants.dart';
import '../../core/errors/exceptions.dart';
import '../../core/network/api_client.dart';
import '../models/user_model.dart';

class AuthRemoteDataSource {
  final ApiClient _apiClient;

  AuthRemoteDataSource(this._apiClient);

  Future<Map<String, dynamic>> _handleAuthResponse(dynamic response) async {
    final wrapper = response.data as Map<String, dynamic>;
    final authData = wrapper['data'] as Map<String, dynamic>;
    await _apiClient.saveTokens(
      accessToken: authData['access_token'] as String,
      refreshToken: authData['refresh_token'] as String,
    );
    return wrapper;
  }

  Future<Map<String, dynamic>> register({
    required String email,
    required String phone,
    required String password,
    required String fullName,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.register,
        data: {
          'email': email,
          'phone': phone,
          'password': password,
          'full_name': fullName,
        },
      );
      return _handleAuthResponse(response);
    } on DioException catch (e) {
      if (e.error is AuthException) rethrow;
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Registration failed',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _apiClient.dio.post(
        ApiConstants.login,
        data: {
          'email': email,
          'password': password,
        },
      );
      return _handleAuthResponse(response);
    } on DioException catch (e) {
      if (e.error is AuthException) rethrow;
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Login failed',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<UserModel> getProfile() async {
    try {
      final response = await _apiClient.dio.get(ApiConstants.updateProfile);
      final wrapper = response.data as Map<String, dynamic>;
      return UserModel.fromJson(wrapper['data'] as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.error is AuthException) rethrow;
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to fetch profile',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<void> updateProfile({
    String? fullName,
    String? phone,
    String? avatarUrl,
  }) async {
    try {
      final body = <String, dynamic>{};
      if (fullName != null) body['full_name'] = fullName;
      if (phone != null) body['phone'] = phone;
      if (avatarUrl != null) body['avatar_url'] = avatarUrl;
      await _apiClient.dio.patch(ApiConstants.updateProfile, data: body);
    } on DioException catch (e) {
      if (e.error is AuthException) rethrow;
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to update profile',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<void> refreshToken() async {
    try {
      final token = await _apiClient.refreshToken;
      if (token == null) {
        throw AuthException(message: 'No refresh token available');
      }
      final response = await _apiClient.dio.post(
        ApiConstants.refreshToken,
        data: {'refresh_token': token},
      );
      final wrapper = response.data as Map<String, dynamic>;
      final authData = wrapper['data'] as Map<String, dynamic>;
      await _apiClient.saveTokens(
        accessToken: authData['access_token'] as String,
        refreshToken: authData['refresh_token'] as String,
      );
    } on DioException catch (e) {
      if (e.error is AuthException) rethrow;
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Token refresh failed',
        statusCode: e.response?.statusCode,
      );
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.dio.post(ApiConstants.logout);
    } on DioException {
    } finally {
      await _apiClient.clearTokens();
    }
  }

  Future<void> forgotPassword(String email) async {
    try {
      await _apiClient.dio.post(
        ApiConstants.forgotPassword,
        data: {'email': email},
      );
    } on DioException catch (e) {
      if (e.error is ServerException) rethrow;
      if (e.error is NetworkException) rethrow;
      throw ServerException(
        message: e.message ?? 'Failed to send reset email',
        statusCode: e.response?.statusCode,
      );
    }
  }
}
