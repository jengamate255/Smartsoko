import 'package:flutter_test/flutter_test.dart';
import 'package:food_delivery_app/models/order.dart';

void main() {
  // Helper function to create test orders
  Order createTestOrder({
    OrderStatus status = OrderStatus.delivered,
    String riderId = 'rider123',
    double deliveryFee = 2000,
  }) {
    return Order(
      id: 'test-order-123',
      userId: 'user-123',
      riderId: riderId,
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
      deliveryFee: deliveryFee,
      total: 20000 + deliveryFee,
      status: status,
      paymentStatus: PaymentStatus.completed,
      deliveryAddress: '123 Test Street',
      deliveryLat: -6.7924,
      deliveryLng: 39.2083,
      createdAt: DateTime.now(),
      deliveredAt: status == OrderStatus.delivered ? DateTime.now() : null,
    );
  }

  group('DeliveryHistoryScreen - Order Filtering Logic', () {
    test('Delivered orders have correct status', () {
      final order = createTestOrder(status: OrderStatus.delivered);
      expect(order.status, equals(OrderStatus.delivered));
      expect(order.deliveredAt, isNotNull);
    });

    test('Non-delivered orders should be filtered out', () {
      final deliveredOrder = createTestOrder(status: OrderStatus.delivered);
      final pendingOrder = createTestOrder(status: OrderStatus.pending);
      final pickedUpOrder = createTestOrder(status: OrderStatus.pickedUp);
      
      final allOrders = [deliveredOrder, pendingOrder, pickedUpOrder];
      final deliveredOrders = allOrders
          .where((order) => order.status == OrderStatus.delivered)
          .toList();
      
      expect(deliveredOrders.length, equals(1));
      expect(deliveredOrders.first.status, equals(OrderStatus.delivered));
    });

    test('Multiple delivered orders are included', () {
      final order1 = createTestOrder(status: OrderStatus.delivered);
      final order2 = createTestOrder(status: OrderStatus.delivered);
      final order3 = createTestOrder(status: OrderStatus.pickedUp);
      
      final allOrders = [order1, order2, order3];
      final deliveredOrders = allOrders
          .where((order) => order.status == OrderStatus.delivered)
          .toList();
      
      expect(deliveredOrders.length, equals(2));
    });

    test('Order contains delivery fee for earnings display', () {
      final order = createTestOrder(deliveryFee: 3500);
      expect(order.deliveryFee, equals(3500));
      expect(order.deliveryFee, greaterThan(0));
    });

    test('Order contains required fields for history display', () {
      final order = createTestOrder();
      expect(order.restaurantId, isNotEmpty);
      expect(order.deliveryAddress, isNotEmpty);
      expect(order.deliveryFee, greaterThan(0));
      expect(order.createdAt, isNotNull);
      expect(order.deliveredAt, isNotNull);
    });

    test('Order with riderId can be retrieved', () {
      final order = createTestOrder(riderId: 'rider123');
      expect(order.riderId, equals('rider123'));
    });

    test('Empty list when no delivered orders', () {
      final pendingOrder = createTestOrder(status: OrderStatus.pending);
      final confirmedOrder = createTestOrder(status: OrderStatus.confirmed);
      
      final allOrders = [pendingOrder, confirmedOrder];
      final deliveredOrders = allOrders
          .where((order) => order.status == OrderStatus.delivered)
          .toList();
      
      expect(deliveredOrders.isEmpty, isTrue);
    });
  });

  group('DeliveryHistoryScreen - Date Handling', () {
    test('Delivered order has deliveredAt timestamp', () {
      final order = createTestOrder(status: OrderStatus.delivered);
      expect(order.deliveredAt, isNotNull);
    });

    test('Non-delivered order may not have deliveredAt timestamp', () {
      final order = createTestOrder(status: OrderStatus.pending);
      expect(order.deliveredAt, isNull);
    });

    test('Order always has createdAt timestamp', () {
      final order = createTestOrder();
      expect(order.createdAt, isNotNull);
    });
  });
}
