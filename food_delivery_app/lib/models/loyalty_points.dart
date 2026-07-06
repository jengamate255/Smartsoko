import 'package:cloud_firestore/cloud_firestore.dart';

class LoyaltyPoints {
  final String id;
  final String userId;
  final int points;
  final int totalEarned;
  final int totalRedeemed;
  final DateTime lastUpdated;

  LoyaltyPoints({
    required this.id,
    required this.userId,
    required this.points,
    required this.totalEarned,
    required this.totalRedeemed,
    required this.lastUpdated,
  });

  factory LoyaltyPoints.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return LoyaltyPoints(
      id: doc.id,
      userId: data['userId'] ?? '',
      points: data['points'] ?? 0,
      totalEarned: data['totalEarned'] ?? 0,
      totalRedeemed: data['totalRedeemed'] ?? 0,
      lastUpdated: (data['lastUpdated'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'points': points,
      'totalEarned': totalEarned,
      'totalRedeemed': totalRedeemed,
      'lastUpdated': Timestamp.fromDate(lastUpdated),
    };
  }

  static int calculatePoints(double orderAmount) {
    return (orderAmount / 1000).floor();
  }

  int calculatePointsFromOrder(double orderAmount) {
    return calculatePoints(orderAmount);
  }

  double calculateDiscountFromPoints() {
    return (points / 100) * 1000;
  }
}

class LoyaltyReward {
  final String id;
  final String title;
  final String description;
  final int pointsRequired;
  final double discountValue;
  final bool isActive;

  LoyaltyReward({
    required this.id,
    required this.title,
    required this.description,
    required this.pointsRequired,
    required this.discountValue,
    this.isActive = true,
  });

  factory LoyaltyReward.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return LoyaltyReward(
      id: doc.id,
      title: data['title'] ?? '',
      description: data['description'] ?? '',
      pointsRequired: data['pointsRequired'] ?? 0,
      discountValue: (data['discountValue'] ?? 0).toDouble(),
      isActive: data['isActive'] ?? true,
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'title': title,
      'description': description,
      'pointsRequired': pointsRequired,
      'discountValue': discountValue,
      'isActive': isActive,
    };
  }
}
