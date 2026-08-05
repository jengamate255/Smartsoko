import 'package:temp_build_project/domain/entities/wallet_transaction.dart';

class WalletTransactionModel {
  static TransactionType _parseType(String type) {
    switch (type) {
      case 'credit':
        return TransactionType.credit;
      case 'debit':
        return TransactionType.debit;
      case 'refund':
        return TransactionType.refund;
      default:
        return TransactionType.debit;
    }
  }

  static TransactionStatus _parseStatus(String status) {
    switch (status) {
      case 'pending':
        return TransactionStatus.pending;
      case 'completed':
        return TransactionStatus.completed;
      case 'failed':
        return TransactionStatus.failed;
      default:
        return TransactionStatus.completed;
    }
  }

  static WalletTransaction fromJson(Map<String, dynamic> json) {
    return WalletTransaction(
      id: json['id'] as String,
      description: json['description'] as String,
      amount: (json['amount'] as num).toDouble(),
      type: _parseType(json['type'] as String),
      status: _parseStatus(json['status'] as String),
      createdAt: DateTime.parse(json['created_at'] as String),
      tripId: json['trip_id'] as String?,
      reference: json['reference'] as String?,
    );
  }

  static Map<String, dynamic> toJson(WalletTransaction transaction) {
    return {
      'id': transaction.id,
      'description': transaction.description,
      'amount': transaction.amount,
      'type': transaction.type.name,
      'status': transaction.status.name,
      'created_at': transaction.createdAt.toIso8601String(),
      'trip_id': transaction.tripId,
      'reference': transaction.reference,
    };
  }
}
