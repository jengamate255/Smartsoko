import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:temp_build_project/domain/entities/wallet_transaction.dart';

class WalletState {
  final double balance;
  final List<WalletTransaction> transactions;
  final bool isLoading;
  final String? error;

  const WalletState({
    this.balance = 0.0,
    this.transactions = const [],
    this.isLoading = false,
    this.error,
  });

  WalletState copyWith({
    double? balance,
    List<WalletTransaction>? transactions,
    bool? isLoading,
    String? error,
  }) {
    return WalletState(
      balance: balance ?? this.balance,
      transactions: transactions ?? this.transactions,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class WalletNotifier extends StateNotifier<WalletState> {
  WalletNotifier() : super(const WalletState());

  Future<void> fetchBalance() async {
    state = state.copyWith(isLoading: true);
    try {
      await Future.delayed(const Duration(seconds: 1));
      state = state.copyWith(balance: 125.50, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> fetchTransactions() async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      await Future.delayed(const Duration(seconds: 1));
      final now = DateTime.now();
      state = state.copyWith(
        transactions: [
          WalletTransaction(
            id: 'txn_1',
            description: 'Trip to Office',
            amount: 24.80,
            type: TransactionType.debit,
            status: TransactionStatus.completed,
            createdAt: now.subtract(const Duration(days: 1)),
            tripId: 'trip_1',
          ),
          WalletTransaction(
            id: 'txn_2',
            description: 'Wallet Top-up',
            amount: 50.00,
            type: TransactionType.credit,
            status: TransactionStatus.completed,
            createdAt: now.subtract(const Duration(days: 2)),
            reference: 'REF-12345',
          ),
          WalletTransaction(
            id: 'txn_3',
            description: 'Trip to Mall',
            amount: 34.50,
            type: TransactionType.debit,
            status: TransactionStatus.completed,
            createdAt: now.subtract(const Duration(days: 3)),
            tripId: 'trip_2',
          ),
          WalletTransaction(
            id: 'txn_4',
            description: 'Refund - Trip cancelled',
            amount: 15.00,
            type: TransactionType.refund,
            status: TransactionStatus.completed,
            createdAt: now.subtract(const Duration(days: 4)),
            tripId: 'trip_3',
          ),
          WalletTransaction(
            id: 'txn_5',
            description: 'Promo Credit',
            amount: 10.00,
            type: TransactionType.credit,
            status: TransactionStatus.completed,
            createdAt: now.subtract(const Duration(days: 5)),
          ),
        ],
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> topUp(double amount) async {
    state = state.copyWith(isLoading: true);
    try {
      await Future.delayed(const Duration(seconds: 2));
      state = state.copyWith(
        balance: state.balance + amount,
        isLoading: false,
      );
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }
}

final walletProvider = StateNotifierProvider<WalletNotifier, WalletState>((ref) {
  return WalletNotifier();
});
