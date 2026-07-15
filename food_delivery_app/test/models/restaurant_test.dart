import 'package:flutter_test/flutter_test.dart';
import 'package:food_delivery_app/models/restaurant.dart';

void main() {
  group('Restaurant Model - OwnerId Field', () {
    test('should include ownerId field in Restaurant model', () {
      // Create a restaurant with ownerId
      final restaurant = Restaurant(
        id: 'test-restaurant-id',
        name: 'Test Restaurant',
        description: 'A test restaurant',
        imageUrl: 'https://example.com/image.jpg',
        address: '123 Test St',
        lat: -1.2921,
        lng: 36.8219,
        category: 'Fast Food',
        rating: 4.5,
        deliveryTimeMinutes: 30,
        deliveryFee: 50.0,
        isOpen: true,
        createdAt: DateTime.now(),
        ownerId: 'test-owner-id',
      );

      // Verify ownerId is set correctly
      expect(restaurant.ownerId, equals('test-owner-id'));
    });

    test('should serialize ownerId to Firestore correctly', () {
      // Create a restaurant with ownerId
      final restaurant = Restaurant(
        id: 'test-restaurant-id',
        name: 'Test Restaurant',
        description: 'A test restaurant',
        imageUrl: 'https://example.com/image.jpg',
        address: '123 Test St',
        lat: -1.2921,
        lng: 36.8219,
        category: 'Fast Food',
        rating: 4.5,
        deliveryTimeMinutes: 30,
        deliveryFee: 50.0,
        isOpen: true,
        createdAt: DateTime.now(),
        ownerId: 'test-owner-id',
      );

      // Serialize to Firestore format
      final firestoreData = restaurant.toFirestore();

      // Verify ownerId is included in serialized data
      expect(firestoreData['ownerId'], equals('test-owner-id'));
      expect(firestoreData['name'], equals('Test Restaurant'));
    });

    test('should handle null ownerId correctly', () {
      // Create a restaurant without ownerId
      final restaurant = Restaurant(
        id: 'test-restaurant-id',
        name: 'Test Restaurant',
        description: 'A test restaurant',
        imageUrl: 'https://example.com/image.jpg',
        address: '123 Test St',
        lat: -1.2921,
        lng: 36.8219,
        category: 'Fast Food',
        rating: 4.5,
        deliveryTimeMinutes: 30,
        deliveryFee: 50.0,
        isOpen: true,
        createdAt: DateTime.now(),
      );

      // Verify ownerId is null
      expect(restaurant.ownerId, isNull);

      // Serialize to Firestore format
      final firestoreData = restaurant.toFirestore();

      // Verify ownerId is not included when null
      expect(firestoreData.containsKey('ownerId'), isFalse);
    });
  });
}
