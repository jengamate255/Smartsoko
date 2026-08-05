import 'package:json_annotation/json_annotation.dart';

part 'driver_earnings.g.dart';

@JsonSerializable()
class DriverEarningsSummary {
  final String walletId;
  final String userId;
  final int balance;
  final int pendingBalance;
  final int totalEarned;
  final int totalWithdrawn;
  final String currency;
  final int pendingFromEscrow;
  final List<TransactionSummary> recentTransactions;

  DriverEarningsSummary({
    required this.walletId,
    required this.userId,
    required this.balance,
    required this.pendingBalance,
    required this.totalEarned,
    required this.totalWithdrawn,
    required this.currency,
    required this.pendingFromEscrow,
    required this.recentTransactions,
  });

  factory DriverEarningsSummary.fromJson(Map<String, dynamic> json) => _$DriverEarningsSummaryFromJson(json);
  Map<String, dynamic> toJson() => _$DriverEarningsSummaryToJson(this);

  String get formattedBalance => 'TZS ${balance.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  String get formattedPending => 'TZS ${pendingBalance.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  String get formattedTotalEarned => 'TZS ${totalEarned.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  String get formattedTotalWithdrawn => 'TZS ${totalWithdrawn.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  String get formattedPendingEscrow => 'TZS ${pendingFromEscrow.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
}

@JsonSerializable()
class TransactionSummary {
  final String id;
  final String type;
  final int amount;
  final int balanceBefore;
  final int balanceAfter;
  final String? description;
  final String? reference;
  final DateTime createdAt;
  final Map<String, dynamic>? metadata;

  TransactionSummary({
    required this.id,
    required this.type,
    required this.amount,
    required this.balanceBefore,
    required this.balanceAfter,
    this.description,
    this.reference,
    required this.createdAt,
    this.metadata,
  });

  factory TransactionSummary.fromJson(Map<String, dynamic> json) => _$TransactionSummaryFromJson(json);
  Map<String, dynamic> toJson() => _$TransactionSummaryToJson(this);

  bool get isCredit => type == 'credit';
  bool get isDebit => type == 'debit';
  String get formattedAmount {
    final sign = isCredit ? '+' : '-';
    return '$sign TZS ${amount.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  }
}

@JsonSerializable()
class DriverEarningsPeriod {
  final String id;
  final String driverId;
  final String periodType;
  final DateTime periodStart;
  final DateTime periodEnd;
  final int totalRides;
  final int completedRides;
  final int cancelledRides;
  final double totalDistanceKm;
  final int totalDurationMinutes;
  final int grossEarnings;
  final int platformFees;
  final int netEarnings;
  final int tipsReceived;
  final int bonuses;
  final int penalties;
  final int walletCredited;
  final bool isFinalized;
  final DateTime? finalizedAt;
  final DateTime createdAt;
  final DateTime updatedAt;

  DriverEarningsPeriod({
    required this.id,
    required this.driverId,
    required this.periodType,
    required this.periodStart,
    required this.periodEnd,
    required this.totalRides,
    required this.completedRides,
    required this.cancelledRides,
    required this.totalDistanceKm,
    required this.totalDurationMinutes,
    required this.grossEarnings,
    required this.platformFees,
    required this.netEarnings,
    required this.tipsReceived,
    required this.bonuses,
    required this.penalties,
    required this.walletCredited,
    required this.isFinalized,
    this.finalizedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DriverEarningsPeriod.fromJson(Map<String, dynamic> json) => _$DriverEarningsPeriodFromJson(json);
  Map<String, dynamic> toJson() => _$DriverEarningsPeriodToJson(this);

  String get formattedGrossEarnings => 'TZS ${grossEarnings.toString().replaceAllMapped(RegExp(r"(\d{1,3})(?=(\d{3})+(?!\d))"), (m) => "${m[1]},")}';
  String get formattedNetEarnings => 'TZS ${netEarnings.toString().replaceAllMapped(RegExp(r"(\d{1,3})(?=(\d{3})+(?!\d))"), (m) => "${m[1]},")}';
  String get formattedPlatformFees => 'TZS ${platformFees.toString().replaceAllMapped(RegExp(r"(\d{1,3})(?=(\d{3})+(?!\d))"), (m) => "${m[1]},")}';
  String get formattedTips => 'TZS ${tipsReceived.toString().replaceAllMapped(RegExp(r"(\d{1,3})(?=(\d{3})+(?!\d))"), (m) => "${m[1]},")}';
  String get formattedBonuses => 'TZS ${bonuses.toString().replaceAllMapped(RegExp(r"(\d{1,3})(?=(\d{3})+(?!\d))"), (m) => "${m[1]},")}';
  
  double get completionRate => totalRides > 0 ? completedRides / totalRides : 0;
  double get avgDistancePerRide => completedRides > 0 ? totalDistanceKm / completedRides : 0;
  double get avgDurationPerRide => completedRides > 0 ? totalDurationMinutes / completedRides : 0;
  double get earningsPerKm => totalDistanceKm > 0 ? netEarnings / totalDistanceKm : 0;
  double get earningsPerHour => totalDurationMinutes > 0 ? (netEarnings / (totalDurationMinutes / 60)) : 0;
}

@JsonSerializable()
class WithdrawalResult {
  final bool success;
  final String? reference;
  final int? amount;
  final int? balanceBefore;
  final int? balanceAfter;
  final String? error;

  WithdrawalResult({
    required this.success,
    this.reference,
    this.amount,
    this.balanceBefore,
    this.balanceAfter,
    this.error,
  });

  factory WithdrawalResult.fromJson(Map<String, dynamic> json) => _$WithdrawalResultFromJson(json);
  Map<String, dynamic> toJson() => _$WithdrawalResultToJson(this);
}

@JsonSerializable()
class DriverBonus {
  final String id;
  final String driverId;
  final String bonusType;
  final String title;
  final String? description;
  final int amount;
  final String currency;
  final String status;
  final String? rideRequestId;
  final String? referredDriverId;
  final Map<String, dynamic> metadata;
  final String? approvedBy;
  final DateTime? approvedAt;
  final DateTime? paidAt;
  final DateTime createdAt;

  DriverBonus({
    required this.id,
    required this.driverId,
    required this.bonusType,
    required this.title,
    this.description,
    required this.amount,
    required this.currency,
    required this.status,
    this.rideRequestId,
    this.referredDriverId,
    required this.metadata,
    this.approvedBy,
    this.approvedAt,
    this.paidAt,
    required this.createdAt,
  });

  factory DriverBonus.fromJson(Map<String, dynamic> json) => _$DriverBonusFromJson(json);
  Map<String, dynamic> toJson() => _$DriverBonusToJson(this);

  bool get isPending => status == 'pending';
  bool get isApproved => status == 'approved';
  bool get isPaid => status == 'paid';
  String get formattedAmount => 'TZS ${amount.toString().replaceAllMapped(RegExp(r"(\d{1,3})(?=(\d{3})+(?!\d))"), (m) => "${m[1]},")}';
}

@JsonSerializable()
class DriverReferral {
  final String id;
  final String referrerId;
  final String? referredId;
  final String referralCode;
  final String? referredEmail;
  final String? referredPhone;
  final String status;
  final int bonusAmount;
  final DateTime? bonusPaidAt;
  final int completedRidesCount;
  final int requiredRidesForBonus;
  final DateTime createdAt;
  final DateTime updatedAt;

  DriverReferral({
    required this.id,
    required this.referrerId,
    this.referredId,
    required this.referralCode,
    this.referredEmail,
    this.referredPhone,
    required this.status,
    required this.bonusAmount,
    this.bonusPaidAt,
    required this.completedRidesCount,
    required this.requiredRidesForBonus,
    required this.createdAt,
    required this.updatedAt,
  });

  factory DriverReferral.fromJson(Map<String, dynamic> json) => _$DriverReferralFromJson(json);
  Map<String, dynamic> toJson() => _$DriverReferralToJson(this);

  double get progress => requiredRidesForBonus > 0 ? completedRidesCount / requiredRidesForBonus : 0;
  bool get isEligibleForBonus => completedRidesCount >= requiredRidesForBonus;
  String get statusDisplayName {
    switch (status) {
      case 'pending':
        return 'Pending Signup';
      case 'signed_up':
        return 'Signed Up';
      case 'document_submitted':
        return 'Documents Submitted';
      case 'approved':
        return 'Approved';
      case 'first_ride_completed':
        return 'First Ride Done';
      case 'bonus_paid':
        return 'Bonus Paid';
      default:
        return status;
    }
  }
}