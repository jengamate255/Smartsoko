import 'package:flutter_test/flutter_test.dart';
import 'package:smartsoko/models/shop.dart';

void main() {
  Product product({bool scheduled = false}) => Product(
    id: 'product-1',
    shopId: 'shop-1',
    name: 'Lunch',
    description: 'Fresh lunch',
    price: 5000,
    category: 'Food',
    createdAt: DateTime(2026, 10, 23),
    hasSchedule: scheduled,
    scheduleDays: scheduled ? 'mon,tue' : null,
    scheduleStart: scheduled ? '09:00' : null,
    scheduleEnd: scheduled ? '17:00' : null,
  );

  test('products without a schedule remain available without time limits', () {
    final item = product();
    expect(item.hasSchedule, isFalse);
    expect(item.scheduleDays, isNull);
    expect(item.scheduleStart, isNull);
    expect(item.scheduleEnd, isNull);
  });

  test('schedule is serialized and preserved when editing another field', () {
    final item = product(scheduled: true).copyWith(name: 'Updated lunch');
    final data = item.toFirestore();
    expect(data['hasSchedule'], isTrue);
    expect(data['scheduleDays'], 'mon,tue');
    expect(data['scheduleStart'], '09:00');
    expect(data['scheduleEnd'], '17:00');
    expect(item.name, 'Updated lunch');
    expect(item.copyWith(hasSchedule: false).hasSchedule, isFalse);
  });
}
