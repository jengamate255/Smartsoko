import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';

class AIProductService {
  // Backend AI extraction endpoint
  static const String _baseUrl = 'https://vonkqyiczeqhuqhahsxm.supabase.co/functions/v1';
  static const String _extractEndpoint = '/ai/products/extract';

  // Extract product information from image using Gemini AI
  static Future<AIProductExtractionResult> extractProductFromImage(File imageFile) async {
    try {
      // The Edge Function expects JSON { imageBase64, mimeType } — NOT multipart
      final imageBytes = await imageFile.readAsBytes();
      final mimeType = _getMimeType(imageFile.path);

      final response = await http.post(
        Uri.parse('$_baseUrl$_extractEndpoint'),
        headers: { 'Content-Type': 'application/json' },
        body: jsonEncode({
          'imageBase64': base64Encode(imageBytes),
          'mimeType': mimeType,
        }),
      );

      if (response.statusCode == 200) {
        final body = jsonDecode(response.body);
        // Response shapes: Edge Function { success, data: {...} } (canonical)
        // or flat { name, price } (local server variant). Accept both.
        final data = (body is Map && body['data'] is Map) ? body['data'] : (body ?? {});
        final priceRaw = data['selling_price'] ?? data['price'];

        return AIProductExtractionResult(
          success: true,
          name: data['name']?.toString() ?? '',
          description: data['description']?.toString() ?? data['brand']?.toString() ?? '',
          price: (priceRaw is num) ? priceRaw.toDouble() : double.tryParse('$priceRaw') ?? 0.0,
          category: data['category']?.toString() ?? '',
          confidence: (data['confidence'] is num) ? data['confidence'].toDouble() : 0.0,
          tags: data['tags'] is List ? List<String>.from(data['tags'].map((t) => '$t')) : [],
        );
      } else {
        return AIProductExtractionResult(
          success: false,
          error: 'Failed to extract product: ${response.statusCode} - ${response.body}',
        );
      }
    } catch (e) {
      debugPrint('Error extracting product from image: $e');
      return AIProductExtractionResult(
        success: false,
        error: 'Error extracting product: $e',
      );
    }
  }

  static String _getMimeType(String path) {
    final extension = path.split('.').last.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'webp':
        return 'image/webp';
      default:
        return 'image/jpeg';
    }
  }
}

class AIProductExtractionResult {
  final bool success;
  final String name;
  final String description;
  final double price;
  final String category;
  final double confidence;
  final List<String> tags;
  final String? error;

  AIProductExtractionResult({
    required this.success,
    this.name = '',
    this.description = '',
    this.price = 0.0,
    this.category = '',
    this.confidence = 0.0,
    this.tags = const [],
    this.error,
  });
}