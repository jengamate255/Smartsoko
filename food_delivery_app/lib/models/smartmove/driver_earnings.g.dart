// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'driver_earnings.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

DriverEarningsSummary _$DriverEarningsSummaryFromJson(
  Map<String, dynamic> json,
) => DriverEarningsSummary(
  walletId: json['walletId'] as String,
  userId: json['userId'] as String,
  balance: (json['balance'] as num).toInt(),
  pendingBalance: (json['pendingBalance'] as num).toInt(),
  totalEarned: (json['totalEarned'] as num).toInt(),
  totalWithdrawn: (json['totalWithdrawn'] as num).toInt(),
  currency: json['currency'] as String,
  pendingFromEscrow: (json['pendingFromEscrow'] as num).toInt(),
  recentTransactions: (json['recentTransactions'] as List<dynamic>)
      .map((e) => TransactionSummary.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$DriverEarningsSummaryToJson(
  DriverEarningsSummary instance,
) => <String, dynamic>{
  'walletId': instance.walletId,
  'userId': instance.userId,
  'balance': instance.balance,
  'pendingBalance': instance.pendingBalance,
  'totalEarned': instance.totalEarned,
  'totalWithdrawn': instance.totalWithdrawn,
  'currency': instance.currency,
  'pendingFromEscrow': instance.pendingFromEscrow,
  'recentTransactions': instance.recentTransactions,
};

TransactionSummary _$TransactionSummaryFromJson(Map<String, dynamic> json) =>
    TransactionSummary(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num).toInt(),
      balanceBefore: (json['balanceBefore'] as num).toInt(),
      balanceAfter: (json['balanceAfter'] as num).toInt(),
      description: json['description'] as String?,
      reference: json['reference'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
      metadata: json['metadata'] as Map<String, dynamic>?,
    );

Map<String, dynamic> _$TransactionSummaryToJson(TransactionSummary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'type': instance.type,
      'amount': instance.amount,
      'balanceBefore': instance.balanceBefore,
      'balanceAfter': instance.balanceAfter,
      'description': instance.description,
      'reference': instance.reference,
      'createdAt': instance.createdAt.toIso8601String(),
      'metadata': instance.metadata,
    };

DriverEarningsPeriod _$DriverEarningsPeriodFromJson(
  Map<String, dynamic> json,
) => DriverEarningsPeriod(
  id: json['id'] as String,
  driverId: json['driverId'] as String,
  periodType: json['periodType'] as String,
  periodStart: DateTime.parse(json['periodStart'] as String),
  periodEnd: DateTime.parse(json['periodEnd'] as String),
  totalRides: (json['totalRides'] as num).toInt(),
  completedRides: (json['completedRides'] as num).toInt(),
  cancelledRides: (json['cancelledRides'] as num).toInt(),
  totalDistanceKm: (json['totalDistanceKm'] as num).toDouble(),
  totalDurationMinutes: (json['totalDurationMinutes'] as num).toInt(),
  grossEarnings: (json['grossEarnings'] as num).toInt(),
  platformFees: (json['platformFees'] as num).toInt(),
  netEarnings: (json['netEarnings'] as num).toInt(),
  tipsReceived: (json['tipsReceived'] as num).toInt(),
  bonuses: (json['bonuses'] as num).toInt(),
  penalties: (json['penalties'] as num).toInt(),
  walletCredited: (json['walletCredited'] as num).toInt(),
  isFinalized: json['isFinalized'] as bool,
  finalizedAt: json['finalizedAt'] == null
      ? null
      : DateTime.parse(json['finalizedAt'] as String),
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$DriverEarningsPeriodToJson(
  DriverEarningsPeriod instance,
) => <String, dynamic>{
  'id': instance.id,
  'driverId': instance.driverId,
  'periodType': instance.periodType,
  'periodStart': instance.periodStart.toIso8601String(),
  'periodEnd': instance.periodEnd.toIso8601String(),
  'totalRides': instance.totalRides,
  'completedRides': instance.completedRides,
  'cancelledRides': instance.cancelledRides,
  'totalDistanceKm': instance.totalDistanceKm,
  'totalDurationMinutes': instance.totalDurationMinutes,
  'grossEarnings': instance.grossEarnings,
  'platformFees': instance.platformFees,
  'netEarnings': instance.netEarnings,
  'tipsReceived': instance.tipsReceived,
  'bonuses': instance.bonuses,
  'penalties': instance.penalties,
  'walletCredited': instance.walletCredited,
  'isFinalized': instance.isFinalized,
  'finalizedAt': instance.finalizedAt?.toIso8601String(),
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
};

WithdrawalResult _$WithdrawalResultFromJson(Map<String, dynamic> json) =>
    WithdrawalResult(
      success: json['success'] as bool,
      reference: json['reference'] as String?,
      amount: (json['amount'] as num?)?.toInt(),
      balanceBefore: (json['balanceBefore'] as num?)?.toInt(),
      balanceAfter: (json['balanceAfter'] as num?)?.toInt(),
      error: json['error'] as String?,
    );

Map<String, dynamic> _$WithdrawalResultToJson(WithdrawalResult instance) =>
    <String, dynamic>{
      'success': instance.success,
      'reference': instance.reference,
      'amount': instance.amount,
      'balanceBefore': instance.balanceBefore,
      'balanceAfter': instance.balanceAfter,
      'error': instance.error,
    };

DriverBonus _$DriverBonusFromJson(Map<String, dynamic> json) => DriverBonus(
  id: json['id'] as String,
  driverId: json['driverId'] as String,
  bonusType: json['bonusType'] as String,
  title: json['title'] as String,
  description: json['description'] as String?,
  amount: (json['amount'] as num).toInt(),
  currency: json['currency'] as String,
  status: json['status'] as String,
  rideRequestId: json['rideRequestId'] as String?,
  referredDriverId: json['referredDriverId'] as String?,
  metadata: json['metadata'] as Map<String, dynamic>,
  approvedBy: json['approvedBy'] as String?,
  approvedAt: json['approvedAt'] == null
      ? null
      : DateTime.parse(json['approvedAt'] as String),
  paidAt: json['paidAt'] == null
      ? null
      : DateTime.parse(json['paidAt'] as String),
  createdAt: DateTime.parse(json['createdAt'] as String),
);

Map<String, dynamic> _$DriverBonusToJson(DriverBonus instance) =>
    <String, dynamic>{
      'id': instance.id,
      'driverId': instance.driverId,
      'bonusType': instance.bonusType,
      'title': instance.title,
      'description': instance.description,
      'amount': instance.amount,
      'currency': instance.currency,
      'status': instance.status,
      'rideRequestId': instance.rideRequestId,
      'referredDriverId': instance.referredDriverId,
      'metadata': instance.metadata,
      'approvedBy': instance.approvedBy,
      'approvedAt': instance.approvedAt?.toIso8601String(),
      'paidAt': instance.paidAt?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
    };

DriverReferral _$DriverReferralFromJson(Map<String, dynamic> json) =>
    DriverReferral(
      id: json['id'] as String,
      referrerId: json['referrerId'] as String,
      referredId: json['referredId'] as String?,
      referralCode: json['referralCode'] as String,
      referredEmail: json['referredEmail'] as String?,
      referredPhone: json['referredPhone'] as String?,
      status: json['status'] as String,
      bonusAmount: (json['bonusAmount'] as num).toInt(),
      bonusPaidAt: json['bonusPaidAt'] == null
          ? null
          : DateTime.parse(json['bonusPaidAt'] as String),
      completedRidesCount: (json['completedRidesCount'] as num).toInt(),
      requiredRidesForBonus: (json['requiredRidesForBonus'] as num).toInt(),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$DriverReferralToJson(DriverReferral instance) =>
    <String, dynamic>{
      'id': instance.id,
      'referrerId': instance.referrerId,
      'referredId': instance.referredId,
      'referralCode': instance.referralCode,
      'referredEmail': instance.referredEmail,
      'referredPhone': instance.referredPhone,
      'status': instance.status,
      'bonusAmount': instance.bonusAmount,
      'bonusPaidAt': instance.bonusPaidAt?.toIso8601String(),
      'completedRidesCount': instance.completedRidesCount,
      'requiredRidesForBonus': instance.requiredRidesForBonus,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };
