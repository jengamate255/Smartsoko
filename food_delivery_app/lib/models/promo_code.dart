import 'package:cloud_firestore/cloud_firestore.dart';

enum PromoType { percentage, fixed, freeDelivery }

class PromoCode {
  final String id;
  final String code;
  final PromoType type;
  final double value;
  final double? minOrderAmount;
  final double? maxDiscount;
  final DateTime? validFrom;
  final DateTime? validUntil;
  final int? usageLimit;
  final int usageCount;
  final bool isActive;
  final List<String>? applicableShopIds;
  final String? description;

  PromoCode({
    required this.id,
    required this.code,
    required this.type,
    required this.value,
    this.minOrderAmount,
    this.maxDiscount,
    this.validFrom,
    this.validUntil,
    this.usageLimit,
    this.usageCount = 0,
    this.isActive = true,
    this.applicableShopIds,
    this.description,
  });

  factory PromoCode.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return PromoCode(
      id: doc.id,
      code: data['code'] ?? '',
      type: PromoType.values.firstWhere(
        (e) => e.name == data['type'],
        orElse: () => PromoType.percentage,
      ),
      value: (data['value'] ?? 0).toDouble(),
      minOrderAmount: data['minOrderAmount']?.toDouble(),
      maxDiscount: data['maxDiscount']?.toDouble(),
      validFrom: (data['validFrom'] as Timestamp?)?.toDate(),
      validUntil: (data['validUntil'] as Timestamp?)?.toDate(),
      usageLimit: data['usageLimit'],
      usageCount: data['usageCount'] ?? 0,
      isActive: data['isActive'] ?? true,
      applicableShopIds: data['applicableShopIds'] != null
          ? List<String>.from(data['applicableShopIds'])
          : null,
      description: data['description'],
    );
  }

  factory PromoCode.fromMap(Map<String, dynamic> data) {
    return PromoCode(
      id: data['id']?.toString() ?? '',
      code: data['code'] ?? '',
      type: PromoType.values.firstWhere(
        (e) => e.name == data['type'],
        orElse: () => PromoType.percentage,
      ),
      value: (data['value'] ?? 0).toDouble(),
      minOrderAmount: data['minOrderAmount']?.toDouble(),
      maxDiscount: data['maxDiscount']?.toDouble(),
      validFrom: (data['validFrom'] as Timestamp?)?.toDate(),
      validUntil: (data['validUntil'] as Timestamp?)?.toDate(),
      usageLimit: data['usageLimit'],
      usageCount: data['usageCount'] ?? 0,
      isActive: data['isActive'] ?? true,
      applicableShopIds: data['applicableShopIds'] != null
          ? List<String>.from(data['applicableShopIds'])
          : null,
      description: data['description'],
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'code': code,
      'type': type.name,
      'value': value,
      'minOrderAmount': minOrderAmount,
      'maxDiscount': maxDiscount,
      'validFrom': validFrom != null ? Timestamp.fromDate(validFrom!) : null,
      'validUntil': validUntil != null ? Timestamp.fromDate(validUntil!) : null,
      'usageLimit': usageLimit,
      'usageCount': usageCount,
      'isActive': isActive,
      'applicableShopIds': applicableShopIds,
      'description': description,
    };
  }

  bool isValid({double? orderAmount, String? shopId}) {
    if (!isActive) return false;

    final now = DateTime.now();
    if (validFrom != null && now.isBefore(validFrom!)) return false;
    if (validUntil != null && now.isAfter(validUntil!)) return false;

    if (usageLimit != null && usageCount >= usageLimit!) return false;

    if (minOrderAmount != null && (orderAmount ?? 0) < minOrderAmount!) return false;

    if (applicableShopIds != null && shopId != null && !applicableShopIds!.contains(shopId)) {
      return false;
    }

    return true;
  }

  double calculateDiscount(double orderAmount, double deliveryFee) {
    if (!isValid(orderAmount: orderAmount)) return 0;

    double discount = 0;
    switch (type) {
      case PromoType.percentage:
        discount = orderAmount * (value / 100);
        if (maxDiscount != null && discount > maxDiscount!) {
          discount = maxDiscount!;
        }
        break;
      case PromoType.fixed:
        discount = value;
        if (discount > orderAmount) discount = orderAmount;
        break;
      case PromoType.freeDelivery:
        discount = deliveryFee;
        break;
    }

    return discount;
  }
}
