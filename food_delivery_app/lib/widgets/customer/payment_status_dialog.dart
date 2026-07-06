import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/order.dart';

enum PaymentDialogStatus { success, failed, timeout }

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
    return AlertDialog(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
      ),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          _buildIcon(),
          const SizedBox(height: 16),
          _buildTitle(),
          const SizedBox(height: 8),
          _buildMessage(),
          if (widget.status == PaymentDialogStatus.success && widget.transactionId != null) ...[
            const SizedBox(height: 12),
            _buildTransactionId(),
          ],
        ],
      ),
      actions: _buildActions(),
    );
  }

  Widget _buildIcon() {
    IconData iconData;
    Color color;

    switch (widget.status) {
      case PaymentDialogStatus.success:
        iconData = Icons.check_circle;
        color = Colors.green;
        break;
      case PaymentDialogStatus.failed:
        iconData = Icons.error;
        color = Colors.red;
        break;
      case PaymentDialogStatus.timeout:
        iconData = Icons.access_time;
        color = Colors.orange;
        break;
    }

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        shape: BoxShape.circle,
      ),
      child: Icon(
        iconData,
        size: 48,
        color: color,
      ),
    );
  }

  Widget _buildTitle() {
    String title;
    Color color;

    switch (widget.status) {
      case PaymentDialogStatus.success:
        title = 'Payment Successful!';
        color = Colors.green;
        break;
      case PaymentDialogStatus.failed:
        title = 'Payment Failed';
        color = Colors.red;
        break;
      case PaymentDialogStatus.timeout:
        title = 'Payment Timeout';
        color = Colors.orange;
        break;
    }

    return Text(
      title,
      style: TextStyle(
        fontSize: 20,
        fontWeight: FontWeight.bold,
        color: color,
      ),
      textAlign: TextAlign.center,
    );
  }

  Widget _buildMessage() {
    String message;

    switch (widget.status) {
      case PaymentDialogStatus.success:
        message = 'Your payment has been processed successfully. Your order is being prepared.';
        break;
      case PaymentDialogStatus.failed:
        message = widget.errorMessage ?? 'The payment could not be completed. Please try again.';
        break;
      case PaymentDialogStatus.timeout:
        message = 'The payment request timed out. Please check your phone and try again.';
        break;
    }

    return Text(
      message,
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

  List<Widget> _buildActions() {
    final canRetry = widget.onRetry != null && widget.retryCount < widget.maxRetries;
    
    switch (widget.status) {
      case PaymentDialogStatus.success:
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
        ];
      case PaymentDialogStatus.failed:
      case PaymentDialogStatus.timeout:
        return [
          if (widget.onRetry != null)
            TextButton(
              onPressed: canRetry
                  ? () {
                      Navigator.of(context).pop();
                      widget.onRetry?.call();
                    }
                  : null,
              child: Text(
                canRetry
                    ? 'Retry (${widget.maxRetries - widget.retryCount} left)'
                    : 'Max retries reached',
                style: TextStyle(
                  color: canRetry ? Colors.orange : Colors.grey,
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
}