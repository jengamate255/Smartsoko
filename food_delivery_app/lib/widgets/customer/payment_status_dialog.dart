import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/order.dart';

enum PaymentDialogStatus { success, failed, timeout }

/// Color and icon mapping for payment statuses - centralizes styling
final Map<PaymentDialogStatus, PaymentStatusStyle> _paymentStatusStyles = {
  PaymentDialogStatus.success:
      const PaymentStatusStyle(icon: Icons.check_circle, color: Colors.green, title: 'Payment Successful!', message: 'Your payment has been processed successfully. Your order is being processed.'),
  PaymentDialogStatus.failed:
      const PaymentStatusStyle(icon: Icons.error, color: Colors.red, title: 'Payment Failed', message: 'The payment could not be completed. Please try again.'),
  PaymentDialogStatus.timeout:
      const PaymentStatusStyle(icon: Icons.access_time, color: Colors.orange, title: 'Payment Timeout', message: 'The payment request timed out. Please check your phone and try again.'),
};

class PaymentStatusStyle {
  final IconData icon;
  final Color color;
  final String title;
  final String message;

  const PaymentStatusStyle({
    required this.icon,
    required this.color,
    required this.title,
    required this.message,
  });
}

class PaymentStatusDialog extends StatefulWidget {
  final String orderId;
  final String? transactionId;
  final String? errorMessage;
  final PaymentDialogStatus status;
  final VoidCallback? onRetry;
  final VoidCallback? onClose;
  final int retryCount;
  final int maxRetries;

  const PaymentStatusDialog({
    super.key,
    required this.orderId,
    this.transactionId,
    this.errorMessage,
    required this.status,
    this.onRetry,
    this.onClose,
    this.retryCount = 0,
    this.maxRetries = 3,
  });

  /// Shows the payment status dialog as a modal bottom sheet or dialog
  static Future<void> show({
    required BuildContext context,
    required String orderId,
    String? transactionId,
    String? errorMessage,
    required PaymentDialogStatus status,
    VoidCallback? onRetry,
    VoidCallback? onClose,
    int retryCount = 0,
    int maxRetries = 3,
  }) {
    return showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => PaymentStatusDialog(
        orderId: orderId,
        transactionId: transactionId,
        errorMessage: errorMessage,
        status: status,
        onRetry: onRetry,
        onClose: onClose,
        retryCount: retryCount,
        maxRetries: maxRetries,
      ),
    );
  }

  /// Creates a dialog that auto-shows timeout after 60 seconds
  static Future<void> showWithTimeout({
    required BuildContext context,
    required String orderId,
    required Future<void> Function() onPaymentComplete,
    required VoidCallback onTimeout,
    VoidCallback? onRetry,
  }) async {
    Timer? timeoutTimer;

    // Start 60 second timeout
    timeoutTimer = Timer(const Duration(seconds: 60), () {
      onTimeout();
    });

    try {
      await onPaymentComplete();
      timeoutTimer?.cancel();
    } catch (e) {
      timeoutTimer?.cancel();
      rethrow;
    }
  }

  @override
  State<PaymentStatusDialog> createState() => _PaymentStatusDialogState();
}

class _PaymentStatusDialogState extends State<PaymentStatusDialog> {
  @override
  Widget build(BuildContext context) {
    final style = _paymentStatusStyles[widget.status]!;
    final canRetry = widget.onRetry != null && widget.retryCount < widget.maxRetries;

    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildIcon(style),
          const SizedBox(height: 16),
          _buildTitle(style),
          const SizedBox(height: 8),
          _buildMessage(style),
          if (widget.status == PaymentDialogStatus.success && widget.transactionId != null) ...[
            const SizedBox(height: 12),
            _buildTransactionId(),
          ],
        ],
      ),
      actions: _buildActions(canRetry),
    );
  }

  Widget _buildIcon(PaymentStatusStyle style) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: style.color.withOpacity(0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(
        style.icon,
        size: 48,
        color: style.color,
      ),
    );
  }

  Widget _buildTitle(PaymentStatusStyle style) {
    return Text(
      style.title,
      style: const TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildMessage(PaymentStatusStyle style) {
    return Text(
      style.message,
      style: const TextStyle(
        fontSize: 14,
        color: Colors.grey,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildTransactionId() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Colors.grey.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.receipt,
            size: 16,
            color: Colors.grey,
          ),
          const SizedBox(width: 8),
          Text(
            'Transaction ID: ${widget.transactionId}',
            style: const TextStyle(
              fontSize: 12,
              fontFamily: 'monospace',
              color: Colors.grey,
            ),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildActions(bool canRetry) {
    return [
      TextButton(
        onPressed: () {
          Navigator.of(context).pop();
          widget.onClose?.call();
        },
        child: const Text(
          'View Order',
          style: TextStyle(
            color: Colors.green,
            fontWeight: FontWeight.bold,
          ),
        ),
      ),
      TextButton(
        onPressed: () {
          Navigator.of(context).pop();
          widget.onClose?.call();
        },
        child: const Text(
          'Cancel',
          style: TextStyle(color: Colors.grey),
        ),
      ),
    ];
  }
}