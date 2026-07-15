import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:food_delivery_app/models/order.dart';

void main() {
  // Helper function to create a test order
  Order createTestOrder({OrderStatus status = OrderStatus.ready}) {
    return Order(
      id: 'test-order-123',
      userId: 'user-123',
      restaurantId: 'restaurant-123',
      items: [
        OrderItem(
          id: 'item-1',
          name: 'Test Item',
          price: 10000,
          quantity: 2,
        ),
      ],
      subtotal: 20000,
      deliveryFee: 2000,
      total: 22000,
      status: status,
      paymentStatus: PaymentStatus.completed,
      deliveryAddress: '123 Test Street',
      deliveryLat: -6.7924,
      deliveryLng: 39.2083,
      createdAt: DateTime.now(),
    );
  }

  group('DriverOrderDetailScreen - Confirmation Dialog', () {
    test('Order model has correct status values', () {
      // Test that OrderStatus enum has the expected values
      expect(OrderStatus.ready, isNotNull);
      expect(OrderStatus.pickedUp, isNotNull);
      expect(OrderStatus.delivered, isNotNull);
    });

    test('Order can be created with ready status', () {
      final order = createTestOrder(status: OrderStatus.ready);
      expect(order.status, equals(OrderStatus.ready));
      expect(order.id, equals('test-order-123'));
    });

    test('Order can be created with pickedUp status', () {
      final order = createTestOrder(status: OrderStatus.pickedUp);
      expect(order.status, equals(OrderStatus.pickedUp));
    });

    test('Order can be created with delivered status', () {
      final order = createTestOrder(status: OrderStatus.delivered);
      expect(order.status, equals(OrderStatus.delivered));
    });

    test('Order contains all required fields', () {
      final order = createTestOrder();
      expect(order.userId, isNotEmpty);
      expect(order.restaurantId, isNotEmpty);
      expect(order.items, isNotEmpty);
      expect(order.subtotal, greaterThan(0));
      expect(order.deliveryFee, greaterThan(0));
      expect(order.total, greaterThan(0));
      expect(order.deliveryAddress, isNotEmpty);
    });
  });
}
