import 'dart:convert';
import 'package:http/http.dart' as http;
import '../services/auth_service.dart';
import '../utils/logger.dart';

class NestJSApiService {
  static const String _baseUrl = 'http://localhost:3000/api';

  final AuthService _authService;

  NestJSApiService(this._authService);

  String? _authToken;

  void setAuthToken(String token) {
    _authToken = token;
  }

  Future<void> _ensureToken() async {
    if (_authToken == null) {
      final firebaseUser = _authService.currentUser;
      if (firebaseUser != null) {
        _authToken = await firebaseUser.getIdToken();
      }
    }
  }

  Map<String, String> _getHeaders() {
    return {
      'Content-Type': 'application/json',
      if (_authToken != null) 'Authorization': 'Bearer $_authToken',
    };
  }

  // Create a delivery job after food/marketplace order is placed
  Future<Map<String, dynamic>?> createDelivery({
    required String pickupName,
    required String pickupAddress,
    required double pickupLat,
    required double pickupLng,
    required String dropoffName,
    required String dropoffAddress,
    required double dropoffLat,
    required double dropoffLng,
    required String customerName,
    required String customerPhone,
    required List<Map<String, dynamic>> items,
    required double totalAmount,
    required double deliveryFee,
    String? deliveryInstructions,
  }) async {
    try {
      await _ensureToken();
      
      final response = await http.post(
        Uri.parse('$_baseUrl/deliveries'),
        headers: _getHeaders(),
        body: jsonEncode({
          'pickup_name': pickupName,
          'pickup_address': pickupAddress,
          'pickup_lat': pickupLat,
          'pickup_lng': pickupLng,
          'dropoff_name': dropoffName,
          'dropoff_address': dropoffAddress,
          'dropoff_lat': dropoffLat,
          'dropoff_lng': dropoffLng,
          'customer_name': customerName,
          'customer_phone': customerPhone,
          'items': items,
          'total_amount': totalAmount,
          'delivery_fee': deliveryFee,
          'delivery_instructions': deliveryInstructions,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        AppLogger.info('Delivery created: ${data['data']['id']}');
        return data['data'];
      } else {
        AppLogger.error('Failed to create delivery: ${response.body}');
        return null;
      }
    } catch (e) {
      AppLogger.error('Error creating delivery: $e');
      return null;
    }
  }

  // Get available deliveries for driver
  Future<Map<String, dynamic>?> getAvailableDeliveries({int page = 1, int limit = 20}) async {
    try {
      await _ensureToken();
      
      final response = await http.get(
        Uri.parse('$_baseUrl/deliveries/available?page=$page&limit=$limit'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body)['data'];
      }
      return null;
    } catch (e) {
      AppLogger.error('Error getting available deliveries: $e');
      return null;
    }
  }

  // Driver accepts a delivery
  Future<Map<String, dynamic>?> acceptDelivery(String deliveryId) async {
    try {
      await _ensureToken();
      
      final response = await http.post(
        Uri.parse('$_baseUrl/deliveries/$deliveryId/accept'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body)['data'];
      }
      return null;
    } catch (e) {
      AppLogger.error('Error accepting delivery: $e');
      return null;
    }
  }

  // Driver updates delivery status
  Future<Map<String, dynamic>?> updateDeliveryStatus(String deliveryId, String status) async {
    try {
      await _ensureToken();
      
      final response = await http.patch(
        Uri.parse('$_baseUrl/deliveries/$deliveryId/status'),
        headers: _getHeaders(),
        body: jsonEncode({'status': status}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body)['data'];
      }
      return null;
    } catch (e) {
      AppLogger.error('Error updating delivery status: $e');
      return null;
    }
  }

  // Get driver's active delivery
  Future<Map<String, dynamic>?> getActiveDelivery() async {
    try {
      await _ensureToken();
      
      final response = await http.get(
        Uri.parse('$_baseUrl/deliveries/active'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body)['data'];
      }
      return null;
    } catch (e) {
      AppLogger.error('Error getting active delivery: $e');
      return null;
    }
  }

  // Get driver's delivery history
  Future<Map<String, dynamic>?> getDeliveryHistory({int page = 1, int limit = 20}) async {
    try {
      await _ensureToken();
      
      final response = await http.get(
        Uri.parse('$_baseUrl/deliveries/history?page=$page&limit=$limit'),
        headers: _getHeaders(),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body)['data'];
      }
      return null;
    } catch (e) {
      AppLogger.error('Error getting delivery history: $e');
      return null;
    }
  }
}