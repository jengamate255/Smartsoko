import '../../core/errors/exceptions.dart';
import '../../core/network/api_client.dart';
import '../../domain/entities/user.dart';
import '../../domain/repositories/auth_repository.dart';
import '../datasources/auth_remote_data_source.dart';
import '../models/user_model.dart';

class AuthRepositoryImpl implements AuthRepository {
  final AuthRemoteDataSource _remoteDataSource;
  final ApiClient _apiClient;

  AuthRepositoryImpl(this._remoteDataSource, this._apiClient);

  @override
  Future<User> login({
    required String email,
    required String password,
  }) async {
    try {
      final result = await _remoteDataSource.login(
        email: email,
        password: password,
      );
      final userData = result['data']['user'] as Map<String, dynamic>;
      return UserModel.fromJson(userData);
    } on AuthException {
      rethrow;
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<User> register({
    required String email,
    required String phone,
    required String password,
    required String fullName,
  }) async {
    try {
      final result = await _remoteDataSource.register(
        email: email,
        phone: phone,
        password: password,
        fullName: fullName,
      );
      final userData = result['data']['user'] as Map<String, dynamic>;
      return UserModel.fromJson(userData);
    } on AuthException {
      rethrow;
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> logout() async {
    try {
      await _remoteDataSource.logout();
    } on AuthException {
      rethrow;
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<User> getProfile() async {
    try {
      return await _remoteDataSource.getProfile();
    } on AuthException {
      rethrow;
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<void> updateProfile({
    String? fullName,
    String? phone,
    String? avatarUrl,
  }) async {
    try {
      await _remoteDataSource.updateProfile(
        fullName: fullName,
        phone: phone,
        avatarUrl: avatarUrl,
      );
    } on AuthException {
      rethrow;
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }

  @override
  Future<bool> isLoggedIn() async {
    final token = await _apiClient.accessToken;
    return token != null;
  }

  @override
  Future<void> forgotPassword(String email) async {
    try {
      await _remoteDataSource.forgotPassword(email);
    } on ServerException {
      rethrow;
    } on NetworkException {
      rethrow;
    } catch (e) {
      throw ServerException(message: e.toString());
    }
  }
}
