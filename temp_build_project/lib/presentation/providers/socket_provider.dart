import 'package:flutter_riverpod/flutter_riverpod.dart';

class SocketService {
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  Future<void> connect(String token) async {
    _isConnected = true;
  }

  Future<void> disconnect() async {
    _isConnected = false;
  }

  void emit(String event, dynamic data) {}

  void on(String event, Function(dynamic) callback) {}

  void off(String event) {}
}

class SocketNotifier extends StateNotifier<SocketService> {
  SocketNotifier() : super(SocketService());

  Future<void> connect(String token) async {
    await state.connect(token);
  }

  Future<void> disconnect() async {
    await state.disconnect();
  }
}

final socketProvider = StateNotifierProvider<SocketNotifier, SocketService>((ref) {
  return SocketNotifier();
});
