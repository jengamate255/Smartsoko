enum TransactionType {
  payment,
  topUp,
  refund,
  promo,
}

class Transaction {
  final String id;
  final TransactionType type;
  final double amount;
  final String description;
  final DateTime createdAt;
  final String? tripId;

  Transaction({
    required this.id,
    required this.type,
    required this.amount,
    required this.description,
    required this.createdAt,
    this.tripId,
  });
}
