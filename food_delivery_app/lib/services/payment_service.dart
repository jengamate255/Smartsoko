import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:smartsoko/models/payment.dart';
import 'package:smartsoko/config/app_config.dart';
import 'package:smartsoko/utils/uuid_utils.dart';
import 'supabase_service.dart';

/// A PesaPal hosted-checkout session for a saved order.
class PesaPalCheckout {
  /// Open this in a browser to let the customer pay.
  final String redirectUrl;

  /// PesaPal's id for the transaction; used to query its status.
  final String orderTrackingId;

  /// The server's reference (also the `payments.transaction_ref`).
  final String merchantReference;

  const PesaPalCheckout({
    required this.redirectUrl,
    required this.orderTrackingId,
    required this.merchantReference,
  });

  factory PesaPalCheckout.fromMap(Map<String, dynamic> data) {
    final checkout = PesaPalCheckout(
      redirectUrl: data['redirectUrl']?.toString() ?? '',
      orderTrackingId: data['orderTrackingId']?.toString() ?? '',
      merchantReference: data['merchantReference']?.toString() ?? '',
    );
    if (checkout.redirectUrl.isEmpty) {
      throw Exception('PesaPal did not return a checkout URL');
    }
    return checkout;
  }
}

/// The state of a PesaPal transaction.
///
/// PesaPal reports a `status_code` where 1 is completed, 2 failed and 3
/// reversed; 0 means the customer has not finished yet.
class PesaPalTransactionStatus {
  final int statusCode;
  final String description;
  final double amount;
  final String currency;
  final String confirmationCode;

  const PesaPalTransactionStatus({
    required this.statusCode,
    required this.description,
    required this.amount,
    required this.currency,
    required this.confirmationCode,
  });

  factory PesaPalTransactionStatus.fromMap(Map<String, dynamic> data) {
    return PesaPalTransactionStatus(
      statusCode: (data['status_code'] as num?)?.toInt() ?? 0,
      description: data['payment_status_description']?.toString() ?? '',
      amount: (data['amount'] as num?)?.toDouble() ?? 0,
      currency: data['currency']?.toString() ?? 'TZS',
      confirmationCode: data['confirmation_code']?.toString() ?? '',
    );
  }

  bool get isCompleted => statusCode == 1;

  bool get hasFailed => statusCode == 2 || statusCode == 3;

  /// True once PesaPal has reached a state the customer cannot leave.
  bool get isFinal => isCompleted || hasFailed;
}

/// Online payments.
///
/// PesaPal is the supported gateway: every call goes through the API server
/// (`/api/payments/pesapal/*`), which holds the consumer key/secret, proves the
/// order belongs to the caller, creates the `payments` ledger row and receives
/// PesaPal's IPN. The app only asks for a checkout URL and reads the resulting
/// status, so no payment credential and no `payments` write happens on the
/// device (`payments` has no anon INSERT policy at all).
///
/// The older [initiateMpesaPayment] flow has no callers left (the legacy
/// `CheckoutScreen` that still used it was removed). It is kept only because a
/// later release may wire a real M-Pesa route to it. The STK push is posted to
/// a Firebase Cloud Function that is not part of this repository and the API
/// server has no M-Pesa route, so that push always fails.
class PaymentService {
  final SupabaseService _supabaseService = SupabaseService();

  SupabaseClient get _client => _supabaseService.client;

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

    final row = await _client
        .from('payments')
        .insert(payment.toMap())
        .select()
        .single();
    final paymentId = row['id'].toString();

    try {
      final response = await http.post(
        Uri.parse(
          'https://us-central1-${AppConfig.firebaseConfig['projectId']}'
          '.cloudfunctions.net/mpesaSTKPush',
        ),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'phone': phone,
          'amount': amount.toInt(),
          'orderId': orderId,
          'paymentId': paymentId,
        }),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body) as Map<String, dynamic>;
        return await _update(
          paymentId,
          checkoutId: data['CheckoutRequestID']?.toString(),
        );
      }

      return await _update(
        paymentId,
        status: MpesaTransactionStatus.failed,
        errorMessage:
            'Failed to initiate STK push (HTTP ${response.statusCode}). '
            'No M-Pesa gateway is configured for this deployment.',
      );
    } catch (e) {
      return _update(
        paymentId,
        status: MpesaTransactionStatus.failed,
        errorMessage: 'Failed to initiate STK push: $e',
      );
    }
  }

  Future<void> handleMpesaCallback(
    String paymentId,
    String receiptNumber,
    bool success,
  ) async {
    await _update(
      paymentId,
      status: success
          ? MpesaTransactionStatus.success
          : MpesaTransactionStatus.failed,
      receiptNumber: receiptNumber,
      completedAt: DateTime.now(),
    );
  }

  /// The `payments` table is not in the `supabase_realtime` publication, so
  /// this emits the current row once instead of subscribing.
  Stream<Payment?> getPaymentStream(String paymentId) {
    return Stream.fromFuture(getPayment(paymentId));
  }

  Future<Payment?> getPayment(String paymentId) async {
    if (!isUuid(paymentId)) return null;
    final row = await _client
        .from('payments')
        .select()
        .eq('id', paymentId)
        .maybeSingle();
    if (row == null) return null;
    return Payment.fromMap(row);
  }

  /// Rewrites the row via [Payment.toMap], keeping fields the caller did not
  /// supply and preserving the original `created_at`.
  Future<Payment> _update(
    String paymentId, {
    MpesaTransactionStatus? status,
    String? checkoutId,
    String? receiptNumber,
    String? errorMessage,
    DateTime? completedAt,
  }) async {
    final current = await getPayment(paymentId);
    if (current == null) {
      throw StateError('Payment $paymentId not found');
    }

    final updated = Payment(
      id: current.id,
      orderId: current.orderId,
      userId: current.userId,
      amount: current.amount,
      phone: current.phone,
      mpesaCheckoutId: checkoutId ?? current.mpesaCheckoutId,
      mpesaReceiptNumber: receiptNumber ?? current.mpesaReceiptNumber,
      status: status ?? current.status,
      errorMessage: errorMessage ?? current.errorMessage,
      createdAt: current.createdAt,
      completedAt: completedAt ?? current.completedAt,
    );

    final payload = updated.toMap()
      ..remove('created_at')
      ..['updated_at'] = DateTime.now().toUtc().toIso8601String();

    final row = await _client
        .from('payments')
        .update(payload)
        .eq('id', paymentId)
        .select()
        .single();
    return Payment.fromMap(row);
  }

  // â”€â”€ PesaPal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  /// Starts a PesaPal hosted checkout for [orderId].
  ///
  /// `POST /api/payments/pesapal/initiate` â€” the server verifies the order
  /// belongs to the signed-in caller, submits it to PesaPal, records the
  /// `payments` ledger row and returns the URL to open. [idToken] must be the
  /// Firebase ID token of that customer; guests are refused because PesaPal
  /// needs a payer identity.
  Future<PesaPalCheckout> initiatePesaPalCheckout({
    required String orderId,
    required String idToken,
  }) async {
    final body = await _send(
      'POST',
      '/payments/pesapal/initiate',
      payload: {'orderId': orderId},
      idToken: idToken,
    );
    return PesaPalCheckout.fromMap(body);
  }

  /// Reads the current state of a PesaPal transaction
  /// (`GET /api/payments/pesapal/status/:orderTrackingId`).
  ///
  /// Poll this after the customer returns from the checkout page; the server
  /// also receives PesaPal's IPN and settles the order/payment rows.
  Future<PesaPalTransactionStatus> getPesapalStatus({
    required String orderTrackingId,
    required String idToken,
  }) async {
    final body = await _send(
      'GET',
      '/payments/pesapal/status/${Uri.encodeComponent(orderTrackingId)}',
      idToken: idToken,
    );
    final data = body['data'];
    if (data is! Map) throw Exception('PesaPal did not return a status');
    return PesaPalTransactionStatus.fromMap(data.cast<String, dynamic>());
  }

  /// Sends a JSON request to the API server and returns the decoded body,
  /// turning any non-2xx response into an exception carrying its message.
  Future<Map<String, dynamic>> _send(
    String method,
    String path, {
    Map<String, dynamic>? payload,
    String? idToken,
  }) async {
    final request = http.Request(
      method,
      Uri.parse('${AppConfig.apiBaseUrl}$path'),
    );
    request.headers['Accept'] = 'application/json';
    if (payload != null) {
      request.headers['Content-Type'] = 'application/json';
      request.body = jsonEncode(payload);
    }
    if (idToken != null && idToken.isNotEmpty) {
      request.headers['Authorization'] = 'Bearer $idToken';
    }

    final streamed = await request.send();
    final response = await http.Response.fromStream(streamed);

    Map<String, dynamic>? body;
    try {
      final decoded = jsonDecode(response.body);
      if (decoded is Map) body = decoded.cast<String, dynamic>();
    } catch (_) {
      body = null;
    }

    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(
        body?['error'] ?? 'Payment service error (HTTP ${response.statusCode})',
      );
    }
    if (body == null) {
      throw Exception('The payment service returned malformed data');
    }
    return body;
  }
}
