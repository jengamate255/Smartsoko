import '../../entities/user.dart';
import '../../repositories/auth_repository.dart';

class RegisterUseCase {
  final AuthRepository _repository;

  RegisterUseCase(this._repository);

  Future<User> call({
    required String email,
    required String phone,
    required String password,
    required String fullName,
  }) {
    return _repository.register(
      email: email,
      phone: phone,
      password: password,
      fullName: fullName,
    );
  }
}
