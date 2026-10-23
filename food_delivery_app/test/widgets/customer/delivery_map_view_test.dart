import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import 'package:smartsoko/models/order.dart';
import 'package:smartsoko/widgets/customer/delivery_map_view.dart';

void main() {
  testWidgets('missing delivery coordinates show a message, not a map', (
    tester,
  ) async {
    final order = Order.fromMap({
      'id': 'order-without-location',
      'items': <dynamic>[],
    });
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(body: DeliveryMapView(order: order)),
      ),
    );
    expect(find.text('Delivery location is not available yet'), findsOneWidget);
    expect(find.byType(GoogleMap), findsNothing);
    expect(tester.takeException(), isNull);
  });
}
