class Wallet {
  final double balance;
  final String currency;
  final String? cardLastFour;
  final bool hasDefaultCard;

  Wallet({
    required this.balance,
    required this.currency,
    this.cardLastFour,
    this.hasDefaultCard = false,
  });
}
