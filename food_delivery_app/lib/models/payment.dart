import 'package:smartsoko/utils/uuid_utils.dart';

enum MpesaTransactionStatus { pending, success, failed }

/// An M-Pesa payment, backed by the Supabase `payments` table.
///
/// The table has no column for the payer's phone number or the M-Pesa
/// identifiers, so those are carried in `metadata` (jsonb).
class Payment {
  final String id;
  final String orderId;
  final String userId;
  final double amount;
  final String phone;
  final String? mpesaCheckoutId;
  final String? mpesaReceiptNumber;
  final MpesaTransactionStatus status;
  final String? errorMessage;
  final DateTime createdAt;
  final DateTime? completedAt;

  Payment({
    required this.id,
    required this.orderId,
    required this.userId,
    required this.amount,
    required this.phone,
    this.mpesaCheckoutId,
    this.mpesaReceiptNumber,
    required this.status,
    this.errorMessage,
    required this.createdAt,
    this.completedAt,
  });

  factory Payment.fromMap(Map<String, dynamic> data) {
    final metadata = _asStringMap(data['metadata']);
    return Payment(
      id: data['id']?.toString() ?? '',
      orderId: data['order_id']?.toString() ?? '',
      userId: data['customer_id']?.toString() ?? '',
      amount: (data['amount'] as num?)?.toDouble() ?? 0,
      phone: metadata['phone']?.toString() ?? '',
      mpesaCheckoutId:
          metadata['mpesa_checkout_id']?.toString() ??
          data['transaction_ref']?.toString(),
      mpesaReceiptNumber: metadata['mpesa_receipt_number']?.toString(),
      status: MpesaTransactionStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => MpesaTransactionStatus.pending,
      ),
      errorMessage: (metadata['error_message'] ?? data['notes'])?.toString(),
      createdAt: _parseDate(data['created_at']) ?? DateTime.now(),
      completedAt: _parseDate(metadata['completed_at']),
    );
  }

  /// Payload for the `payments` table.
  ///
  /// `id` and `updated_at` are always left to the database. `order_id` and
  /// `customer_id` are uuid FKs, so anything that is not a uuid is sent as null
  /// rather than rejected by Postgres.
  Map<String, dynamic> toMap() {
    return {
      'order_id': isUuid(orderId) ? orderId : null,
      'customer_id': isUuid(userId) ? userId : null,
      'amount': amount.round(),
      'method': 'mpesa',
      'status': status.name,
      'transaction_ref': mpesaCheckoutId ?? mpesaReceiptNumber,
      'notes': errorMessage,
      'metadata': {
        'phone': phone,
        if (mpesaCheckoutId != null) 'mpesa_checkout_id': mpesaCheckoutId,
        if (mpesaReceiptNumber != null)
          'mpesa_receipt_number': mpesaReceiptNumber,
        if (errorMessage != null) 'error_message': errorMessage,
        if (completedAt != null)
          'completed_at': completedAt!.toUtc().toIso8601String(),
      },
      'created_at': createdAt.toUtc().toIso8601String(),
    };
  }

  static Map<String, dynamic> _asStringMap(Object? value) {
    if (value is Map) return value.cast<String, dynamic>();
    return const {};
  }

  static DateTime? _parseDate(Object? value) {
    if (value == null) return null;
    if (value is DateTime) return value;
    return DateTime.tryParse(value.toString());
  }
}
