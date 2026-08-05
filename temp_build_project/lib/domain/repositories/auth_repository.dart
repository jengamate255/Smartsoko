import '../entities/user.dart';

abstract class AuthRepository {
  Future<User> login({required String email, required String password});
  Future<User> register({
    required String email,
    required String phone,
    required String password,
    required String fullName,
  });
  Future<void> logout();
  Future<User> getProfile();
  Future<void> updateProfile({String? fullName, String? phone, String? avatarUrl});
  Future<bool> isLoggedIn();
  Future<void> forgotPassword(String email);
}
