import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../models/payment.dart';
import '../config/app_config.dart';

class PaymentService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  CollectionReference get _payments => _firestore.collection(AppConfig.paymentsCollection);

  Future<Payment> initiateMpesaPayment({
    required String orderId,
    required String userId,
    required double amount,
    required String phone,
  }) async {
    final payment = Payment(
      id: '',
      orderId: orderId,
      userId: userId,
      amount: amount,
      phone: phone,
      status: MpesaTransactionStatus.pending,
      createdAt: DateTime.now(),
    );

    final docRef = await _payments.add(payment.toFirestore());
    final paymentId = docRef.id;

    try {
      final response = await http.post(
        Uri.parse('https://us-central1-${AppConfig.firebaseConfig['projectId']}.cloudfunctions.net/mpesaSTKPush'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': phone,
          'amount': amount.toInt(),
          'orderId': orderId,
          'paymentId': paymentId,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        await _payments.doc(paymentId).update({
          'mpesaCheckoutId': data['CheckoutRequestID'],
        });
      } else {
        await _payments.doc(paymentId).update({
          'status': MpesaTransactionStatus.failed.name,
          'errorMessage': 'Failed to initiate STK push',
        });
      }
    } catch (e) {
      await _payments.doc(paymentId).update({
        'status': MpesaTransactionStatus.failed.name,
        'errorMessage': e.toString(),
      });
    }

    final doc = await docRef.get();
    return Payment.fromFirestore(doc);
  }

  Future<void> handleMpesaCallback(String paymentId, String receiptNumber, bool success) async {
    await _payments.doc(paymentId).update({
      'mpesaReceiptNumber': receiptNumber,
      'status': success ? MpesaTransactionStatus.success.name : MpesaTransactionStatus.failed.name,
      'completedAt': FieldValue.serverTimestamp(),
    });
  }

  Stream<Payment?> getPaymentStream(String paymentId) {
    return _payments.doc(paymentId).snapshots().map((doc) {
      if (!doc.exists) return null;
      return Payment.fromFirestore(doc);
    });
  }

  Future<Payment?> getPayment(String paymentId) async {
    final doc = await _payments.doc(paymentId).get();
    if (!doc.exists) return null;
    return Payment.fromFirestore(doc);
  }
}
