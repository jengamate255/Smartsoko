enum TransactionType {
  credit,
  debit,
  refund,
}

enum TransactionStatus {
  pending,
  completed,
  failed,
}

class WalletTransaction {
  final String id;
  final String description;
  final double amount;
  final TransactionType type;
  final TransactionStatus status;
  final DateTime createdAt;
  final String? tripId;
  final String? reference;

  const WalletTransaction({
    required this.id,
    required this.description,
    required this.amount,
    required this.type,
    required this.status,
    required this.createdAt,
    this.tripId,
    this.reference,
  });
}
