import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/promo_code.dart';

class PromoService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final CollectionReference _promos = FirebaseFirestore.instance.collection('promo_codes');

  Stream<List<PromoCode>> getActivePromos() {
    return _promos
        .where('isActive', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => PromoCode.fromFirestore(doc))
            .toList());
  }

  Future<PromoCode?> validatePromoCode(String code, {double? orderAmount, String? shopId}) async {
    try {
      final query = await _promos
          .where('code', isEqualTo: code.toUpperCase())
          .limit(1)
          .get();

      if (query.docs.isEmpty) return null;

      final promo = PromoCode.fromFirestore(query.docs.first);

      if (!promo.isValid(orderAmount: orderAmount, shopId: shopId)) {
        return null;
      }

      return promo;
    } catch (e) {
      return null;
    }
  }

  Future<void> incrementUsage(String promoId) async {
    await _promos.doc(promoId).update({
      'usageCount': FieldValue.increment(1),
    });
  }

  Future<PromoCode> createPromoCode({
    required String code,
    required PromoType type,
    required double value,
    double? minOrderAmount,
    double? maxDiscount,
    DateTime? validFrom,
    DateTime? validUntil,
    int? usageLimit,
    List<String>? applicableShopIds,
    String? description,
  }) async {
    final promo = PromoCode(
      id: '',
      code: code.toUpperCase(),
      type: type,
      value: value,
      minOrderAmount: minOrderAmount,
      maxDiscount: maxDiscount,
      validFrom: validFrom,
      validUntil: validUntil,
      usageLimit: usageLimit,
      isActive: true,
      applicableShopIds: applicableShopIds,
      description: description,
    );

    final docRef = await _promos.add(promo.toFirestore());
    final doc = await docRef.get();
    return PromoCode.fromFirestore(doc);
  }

  Future<void> togglePromoStatus(String promoId, bool isActive) async {
    await _promos.doc(promoId).update({'isActive': isActive});
  }

  Future<void> deletePromoCode(String promoId) async {
    await _promos.doc(promoId).delete();
  }
}
