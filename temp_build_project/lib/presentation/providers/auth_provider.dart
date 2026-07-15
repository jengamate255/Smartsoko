import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:temp_build_project/domain/entities/user.dart';

class AuthState {
  final User? currentUser;
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;

  const AuthState({
    this.currentUser,
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
  });

  AuthState copyWith({
    User? currentUser,
    bool? isLoading,
    String? error,
    bool? isAuthenticated,
  }) {
    return AuthState(
      currentUser: currentUser ?? this.currentUser,
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  AuthNotifier() : super(const AuthState());

  Future<void> login(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(seconds: 2));
      final user = User(
        id: 'user_1',
        fullName: 'John Doe',
        email: email,
        phone: '+1234567890',
        createdAt: DateTime.now(),
      );
      state = state.copyWith(
        currentUser: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> register(String name, String email, String phone, String password) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(seconds: 2));
      final user = User(
        id: 'user_${DateTime.now().millisecondsSinceEpoch}',
        fullName: name,
        email: email,
        phone: phone,
        createdAt: DateTime.now(),
      );
      state = state.copyWith(
        currentUser: user,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      );
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString(),
      );
    }
  }

  Future<void> logout() async {
    state = const AuthState();
  }

  Future<void> checkAuth() async {
    state = state.copyWith(isLoading: true);
    try {
      await Future.delayed(const Duration(milliseconds: 500));
      state = state.copyWith(isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void clearError() {
    state = state.copyWith(error: null);
  }
}

final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier();
});
