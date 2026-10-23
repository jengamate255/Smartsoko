import 'package:flutter_test/flutter_test.dart';
import 'package:smartsoko/models/order.dart';

void main() {
  group('OrderStatus.apiValue', () {
    test('maps the enum onto the server/DB lifecycle strings', () {
      expect(OrderStatus.pending.apiValue, 'pending');
      expect(OrderStatus.confirmed.apiValue, 'accepted');
      expect(OrderStatus.preparing.apiValue, 'preparing');
      expect(OrderStatus.ready.apiValue, 'ready_for_delivery');
      expect(OrderStatus.pickedUp.apiValue, 'picked_up');
      expect(OrderStatus.delivered.apiValue, 'delivered');
      expect(OrderStatus.cancelled.apiValue, 'cancelled');
    });

    test('every status survives a round trip', () {
      for (final status in OrderStatus.values) {
        expect(OrderStatus.fromApiValue(status.apiValue), status);
      }
    });
  });

  group('OrderStatus.fromApiValue', () {
    test('folds the aliases the server accepts', () {
      expect(OrderStatus.fromApiValue('confirmed'), OrderStatus.confirmed);
      expect(OrderStatus.fromApiValue('ready'), OrderStatus.ready);
      expect(OrderStatus.fromApiValue('assigned'), OrderStatus.ready);
      expect(OrderStatus.fromApiValue('pickedup'), OrderStatus.pickedUp);
      expect(OrderStatus.fromApiValue('in_transit'), OrderStatus.pickedUp);
      expect(OrderStatus.fromApiValue('dispatched'), OrderStatus.pickedUp);
      expect(OrderStatus.fromApiValue('completed'), OrderStatus.delivered);
    });

    test('is case and whitespace tolerant, defaulting to pending', () {
      expect(OrderStatus.fromApiValue(' COMPLETED '), OrderStatus.delivered);
      expect(OrderStatus.fromApiValue('nonsense'), OrderStatus.pending);
      expect(OrderStatus.fromApiValue(null), OrderStatus.pending);
    });
  });

  group('Order.fromMap', () {
    test('reads snake_case statuses instead of defaulting to pending', () {
      final order = Order.fromMap({
        'id': 'order-1',
        'status': 'ready_for_delivery',
        'payment_status': 'paid',
        'items': <dynamic>[],
      });

      expect(order.status, OrderStatus.ready);
      expect(order.paymentStatus, PaymentStatus.completed);
    });

    test('treats the COD sentinel as not yet paid', () {
      final order = Order.fromMap({
        'id': 'order-2',
        'status': 'picked_up',
        'payment_status': 'cod',
        'items': <dynamic>[],
      });

      expect(order.status, OrderStatus.pickedUp);
      expect(order.paymentStatus, PaymentStatus.pending);
    });
  });
}
