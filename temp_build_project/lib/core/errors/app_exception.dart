class AppException implements Exception {
  final String message;
  final int? statusCode;

  const AppException(this.message, {this.statusCode});

  @override
  String toString() => message;
}

class NetworkException extends AppException {
  const NetworkException([super.message = 'Network error occurred']);
}

class AuthException extends AppException {
  const AuthException([super.message = 'Authentication failed']);
}

class ServerException extends AppException {
  const ServerException([String message = 'Server error', int? statusCode])
      : super(message, statusCode: statusCode);
}

class ValidationException extends AppException {
  final Map<String, String>? errors;
  const ValidationException([super.message = 'Validation failed', this.errors]);
}
