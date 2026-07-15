class ServerException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic data;

  ServerException({required this.message, this.statusCode, this.data});

  @override
  String toString() => 'ServerException: $message (status: $statusCode)';
}

class AuthException implements Exception {
  final String message;
  final int? statusCode;

  AuthException({required this.message, this.statusCode});

  @override
  String toString() => 'AuthException: $message';
}

class CacheException implements Exception {
  final String message;

  CacheException({required this.message});

  @override
  String toString() => 'CacheException: $message';
}

class NetworkException implements Exception {
  final String message;
  final String? url;

  NetworkException({required this.message, this.url});

  @override
  String toString() => 'NetworkException: $message (url: $url)';
}
