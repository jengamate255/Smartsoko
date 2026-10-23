import 'package:flutter_test/flutter_test.dart';
import 'package:smartsoko/models/payment.dart';

const _orderId = '99218036-79fe-4e6f-84f2-673bef993df6';
const _customerId = '62f63314-16e4-4347-8248-4bda8bba6abb';

Payment _payment({
  String orderId = _orderId,
  String userId = _customerId,
  double amount = 15000,
  String? checkoutId,
  String? receiptNumber,
  String? errorMessage,
  MpesaTransactionStatus status = MpesaTransactionStatus.pending,
  DateTime? completedAt,
}) {
  return Payment(
    id: '',
    orderId: orderId,
    userId: userId,
    amount: amount,
    phone: '255712345678',
    mpesaCheckoutId: checkoutId,
    mpesaReceiptNumber: receiptNumber,
    status: status,
    errorMessage: errorMessage,
    createdAt: DateTime.utc(2026, 10, 17, 12),
    completedAt: completedAt,
  );
}

void main() {
  group('Payment.fromMap', () {
    test('reads a Supabase row, with M-Pesa details from metadata', () {
      final payment = Payment.fromMap({
        'id': '1b2b0f6e-2c8f-4a3f-9d5e-0d3f3a5c9b11',
        'order_id': _orderId,
        'customer_id': _customerId,
        'amount': 15000,
        'status': 'pending',
        'metadata': {'phone': '255712345678', 'mpesa_checkout_id': 'ws_CO_123'},
        'created_at': '2026-10-17T12:00:00.000Z',
      });

      expect(payment.id, '1b2b0f6e-2c8f-4a3f-9d5e-0d3f3a5c9b11');
      expect(payment.orderId, _orderId);
      expect(payment.userId, _customerId);
      expect(payment.amount, 15000);
      expect(payment.phone, '255712345678');
      expect(payment.mpesaCheckoutId, 'ws_CO_123');
      expect(payment.status, MpesaTransactionStatus.pending);
      expect(payment.createdAt.toUtc(), DateTime.utc(2026, 10, 17, 12));
    });

    test('falls back to transaction_ref and notes without metadata', () {
      final payment = Payment.fromMap({
        'id': 'p1',
        'transaction_ref': 'ws_CO_999',
        'notes': 'Failed to initiate STK push',
        'status': 'failed',
      });

      expect(payment.mpesaCheckoutId, 'ws_CO_999');
      expect(payment.errorMessage, 'Failed to initiate STK push');
      expect(payment.status, MpesaTransactionStatus.failed);
      expect(payment.phone, '');
    });

    test('an unknown status column value maps to pending', () {
      expect(
        Payment.fromMap({'id': 'p1', 'status': 'refunded'}).status,
        MpesaTransactionStatus.pending,
      );
    });
  });

  group('Payment.toMap', () {
    test('sends null for uuid FKs that are not uuids (demo session)', () {
      final map = _payment(orderId: '', userId: 'AbCdEf1234567890').toMap();

      expect(map['order_id'], isNull);
      expect(map['customer_id'], isNull);
      expect(map['method'], 'mpesa');
    });

    test('keeps uuid FKs and rounds money to integers', () {
      final map = _payment(amount: 1500.6).toMap();

      expect(map['order_id'], _orderId);
      expect(map['customer_id'], _customerId);
      expect(map['amount'], 1501);
      expect(map['metadata']['phone'], '255712345678');
    });

    test('records the M-Pesa identifiers and failure reason in metadata', () {
      final map = _payment(
        checkoutId: 'ws_CO_1',
        receiptNumber: 'RJ41ABCDEF',
        errorMessage: 'gateway unavailable',
        status: MpesaTransactionStatus.failed,
        completedAt: DateTime.utc(2026, 10, 17, 12, 5),
      ).toMap();

      expect(map['transaction_ref'], 'ws_CO_1');
      expect(map['notes'], 'gateway unavailable');
      expect(map['status'], 'failed');
      expect(map['metadata']['mpesa_checkout_id'], 'ws_CO_1');
      expect(map['metadata']['mpesa_receipt_number'], 'RJ41ABCDEF');
      expect(map['metadata']['error_message'], 'gateway unavailable');
      expect(map['metadata']['completed_at'], '2026-10-17T12:05:00.000Z');
    });

    test('round-trips through fromMap', () {
      final original = _payment(
        checkoutId: 'ws_CO_7',
        status: MpesaTransactionStatus.failed,
        errorMessage: 'boom',
      );
      final restored = Payment.fromMap({'id': 'p9', ...original.toMap()});

      expect(restored.orderId, original.orderId);
      expect(restored.userId, original.userId);
      expect(restored.amount, original.amount);
      expect(restored.phone, original.phone);
      expect(restored.mpesaCheckoutId, 'ws_CO_7');
      expect(restored.status, MpesaTransactionStatus.failed);
      expect(restored.errorMessage, 'boom');
    });
  });
}
