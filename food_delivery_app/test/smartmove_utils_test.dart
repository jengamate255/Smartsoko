import 'package:flutter_test/flutter_test.dart';
import 'package:intl/intl.dart';

void main() {
  group('Price Formatting', () {
    test('formatPrice with commas works correctly', () {
      // Helper to test price formatting
      String formatPriceWithCommas(double price) {
        final formatted = price.toStringAsFixed(0);
        final buffer = StringBuffer();
        var count = 0;
        for (var i = formatted.length - 1; i >= 0; i--) {
          if (count == 3) {
            buffer.write(',');
            count = 0;
          }
          buffer.write(formatted[i]);
          count++;
        }
        return 'TZS ${buffer.toString().split('').reversed.join()}';
      }

      expect(formatPriceWithCommas(1000), 'TZS 1,000');
      expect(formatPriceWithCommas(10000), 'TZS 10,000');
      expect(formatPriceWithCommas(100000), 'TZS 100,000');
      expect(formatPriceWithCommas(7350), 'TZS 7,350');
      expect(formatPriceWithCommas(0), 'TZS 0');
      expect(formatPriceWithCommas(999), 'TZS 999');
    });

    test('NumberFormat produces correct TZS format', () {
      final formatter = NumberFormat.currency(
        locale: 'sw_TZ',
        symbol: 'TZS ',
        decimalDigits: 0,
      );

      expect(formatter.format(1000), 'TZS\u00a01,000');
      expect(formatter.format(7350), 'TZS\u00a07,350');
    });
  });

  group('Distance and ETA Formatting', () {
    test('distance formatting shows correct units', () {
      String formatDistance(double km) {
        if (km < 1.0) return '${(km * 1000).toStringAsFixed(0)} m';
        return '${km.toStringAsFixed(1)} km';
      }

      expect(formatDistance(0.5), '500 m');
      expect(formatDistance(1.0), '1.0 km');
      expect(formatDistance(5.5), '5.5 km');
    });
  });
}
