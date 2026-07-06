import 'package:cloud_firestore/cloud_firestore.dart';

enum MpesaTransactionStatus { pending, success, failed }

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

  factory Payment.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return Payment(
      id: doc.id,
      orderId: data['orderId'] ?? '',
      userId: data['userId'] ?? '',
      amount: (data['amount'] ?? 0).toDouble(),
      phone: data['phone'] ?? '',
      mpesaCheckoutId: data['mpesaCheckoutId'],
      mpesaReceiptNumber: data['mpesaReceiptNumber'],
      status: MpesaTransactionStatus.values.firstWhere(
        (e) => e.name == data['status'],
        orElse: () => MpesaTransactionStatus.pending,
      ),
      errorMessage: data['errorMessage'],
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      completedAt: (data['completedAt'] as Timestamp?)?.toDate(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'orderId': orderId,
      'userId': userId,
      'amount': amount,
      'phone': phone,
      'mpesaCheckoutId': mpesaCheckoutId,
      'mpesaReceiptNumber': mpesaReceiptNumber,
      'status': status.name,
      'errorMessage': errorMessage,
      'createdAt': Timestamp.fromDate(createdAt),
      'completedAt': completedAt != null ? Timestamp.fromDate(completedAt!) : null,
    };
  }
}
