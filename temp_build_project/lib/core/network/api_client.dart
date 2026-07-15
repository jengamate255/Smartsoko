import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../constants/api_constants.dart';
import '../constants/app_constants.dart';
import '../errors/exceptions.dart';

class ApiClient {
  late final Dio _dio;
  final FlutterSecureStorage _storage;
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';

  ApiClient({FlutterSecureStorage? storage})
      : _storage = storage ?? const FlutterSecureStorage() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConstants.baseUrl,
        connectTimeout: const Duration(seconds: 15),
        receiveTimeout: const Duration(seconds: 15),
        sendTimeout: const Duration(seconds: 15),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      ),
    );

    _dio.interceptors.addAll([
      _AuthInterceptor(_dio, _storage),
      _RetryInterceptor(),
      _ErrorInterceptor(),
      LogInterceptor(
        requestBody: true,
        responseBody: true,
        error: true,
        logPrint: (obj) => print('[API] $obj'),
      ),
    ]);
  }

  Dio get dio => _dio;

  Future<String?> get accessToken => _storage.read(key: _accessTokenKey);
  Future<String?> get refreshToken => _storage.read(key: _refreshTokenKey);

  Future<void> saveTokens({
    required String accessToken,
    required String refreshToken,
  }) async {
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: accessToken),
      _storage.write(key: _refreshTokenKey, value: refreshToken),
    ]);
  }

  Future<void> clearTokens() async {
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
    ]);
  }
}

class _AuthInterceptor extends Interceptor {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  bool _isRefreshing = false;

  _AuthInterceptor(this._dio, this._storage);

  @override
  void onRequest(
    RequestOptions options,
    RequestInterceptorHandler handler,
  ) async {
    final token = await _storage.read(key: 'access_token');
    if (token != null && !options.path.contains('/auth/')) {
      options.headers['Authorization'] = 'Bearer $token';
    }
    handler.next(options);
  }

  @override
  void onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode == 401 && !_isRefreshing) {
      _isRefreshing = true;
      try {
        final refreshToken =
            await _storage.read(key: 'refresh_token');
        if (refreshToken == null) {
          handler.next(err);
          return;
        }
        final response = await _dio.post(
          ApiConstants.refreshToken,
          data: {'refresh_token': refreshToken},
        );
        final wrapper = response.data as Map<String, dynamic>;
        final authData = wrapper['data'] as Map<String, dynamic>;
        final newAccess = authData['access_token'] as String;
        final newRefresh = authData['refresh_token'] as String;
        await _storage.write(key: 'access_token', value: newAccess);
        await _storage.write(key: 'refresh_token', value: newRefresh);

        final retryOptions = err.requestOptions;
        retryOptions.headers['Authorization'] = 'Bearer $newAccess';
        final retryResponse = await _dio.fetch(retryOptions);
        handler.resolve(retryResponse);
      } catch (_) {
        await _storage.deleteAll();
        handler.next(err);
      } finally {
        _isRefreshing = false;
      }
    } else {
      handler.next(err);
    }
  }
}

class _RetryInterceptor extends Interceptor {
  @override
  void onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (_shouldRetry(err)) {
      final retryCount =
          err.requestOptions.extra['retryCount'] as int? ?? 0;
      if (retryCount < AppConstants.maxRetries) {
        await Future.delayed(
          Duration(milliseconds: 500 * (retryCount + 1)),
        );
        final retryOptions = err.requestOptions;
        retryOptions.extra['retryCount'] = retryCount + 1;
        try {
          final response = await Dio().fetch(retryOptions);
          handler.resolve(response);
          return;
        } catch (_) {}
      }
    }
    handler.next(err);
  }

  bool _shouldRetry(DioException err) {
    return err.type == DioExceptionType.connectionTimeout ||
        err.type == DioExceptionType.receiveTimeout ||
        err.type == DioExceptionType.connectionError;
  }
}

class _ErrorInterceptor extends Interceptor {
  @override
  void onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) {
    switch (err.type) {
      case DioExceptionType.connectionTimeout:
      case DioExceptionType.receiveTimeout:
      case DioExceptionType.sendTimeout:
        handler.next(
          DioException(
            requestOptions: err.requestOptions,
            error: NetworkException(
              message: 'Connection timed out. Please try again.',
              url: err.requestOptions.path,
            ),
          ),
        );
        break;
      case DioExceptionType.connectionError:
        handler.next(
          DioException(
            requestOptions: err.requestOptions,
            error: NetworkException(
              message: 'No internet connection. Please check your network.',
              url: err.requestOptions.path,
            ),
          ),
        );
        break;
      case DioExceptionType.badResponse:
        final statusCode = err.response?.statusCode ?? 0;
        final data = err.response?.data;
        final message = data is Map ? data['message'] as String? : null;

        if (statusCode == 401) {
          handler.next(
            DioException(
              requestOptions: err.requestOptions,
              error: AuthException(
                message: message ?? 'Session expired. Please login again.',
                statusCode: statusCode,
              ),
            ),
          );
        } else if (statusCode == 403) {
          handler.next(
            DioException(
              requestOptions: err.requestOptions,
              error: AuthException(
                message: message ?? 'Access denied.',
                statusCode: statusCode,
              ),
            ),
          );
        } else if (statusCode == 422) {
          handler.next(
            DioException(
              requestOptions: err.requestOptions,
              error: ServerException(
                message: message ?? 'Validation failed.',
                statusCode: statusCode,
                data: data,
              ),
            ),
          );
        } else {
          handler.next(
            DioException(
              requestOptions: err.requestOptions,
              error: ServerException(
                message: message ?? 'Something went wrong.',
                statusCode: statusCode,
                data: data,
              ),
            ),
          );
        }
        break;
      case DioExceptionType.cancel:
        handler.next(err);
        break;
      default:
        handler.next(
          DioException(
            requestOptions: err.requestOptions,
            error: ServerException(
              message: 'An unexpected error occurred.',
            ),
          ),
        );
    }
  }
}
