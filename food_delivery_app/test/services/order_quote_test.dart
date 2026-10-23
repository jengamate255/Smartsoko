import 'package:flutter_test/flutter_test.dart';
import 'package:smartsoko/services/order_service.dart';

void main() {
  group('OrderQuote.fromMap', () {
    test('maps the API server quote payload', () {
      // Shape returned by POST /api/orders/quote (see services/checkout.js).
      final quote = OrderQuote.fromMap({
        'items': [
          {'id': 'cac724c2-011a-4bbb-8a2b-08a9e833fd8f', 'price': 9000},
        ],
        'subtotal': 18000,
        'deliveryFee': 2000,
        'taxAmount': 3240,
        'discount': 0,
        'total': 23240,
        'currency': 'TZS',
      });

      expect(quote.subtotal, 18000);
      expect(quote.deliveryFee, 2000);
      expect(quote.tax, 3240);
      expect(quote.discount, 0);
      expect(quote.total, 23240);
      expect(quote.currency, 'TZS');
    });

    test('missing amounts read as zero and currency defaults to TZS', () {
      final quote = OrderQuote.fromMap({});

      expect(quote.subtotal, 0);
      expect(quote.deliveryFee, 0);
      expect(quote.tax, 0);
      expect(quote.discount, 0);
      expect(quote.total, 0);
      expect(quote.currency, 'TZS');
    });
  });
}
