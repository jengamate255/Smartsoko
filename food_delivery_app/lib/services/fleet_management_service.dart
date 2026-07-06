import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/driver_fleet.dart';

class FleetManagementService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final CollectionReference _drivers = FirebaseFirestore.instance.collection('drivers');
  final CollectionReference _zones = FirebaseFirestore.instance.collection('delivery_zones');

  Stream<List<DriverProfile>> getDriversByZone(String zoneId) {
    return _drivers
        .where('assigned_zone', isEqualTo: zoneId)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => DriverProfile.fromFirestore(doc))
            .toList());
  }

  Stream<List<DriverProfile>> getOnlineDrivers() {
    return _drivers
        .where('is_online', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => DriverProfile.fromFirestore(doc))
            .toList());
  }

  Stream<List<DriverProfile>> getAllDrivers() {
    return _drivers
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => DriverProfile.fromFirestore(doc))
            .toList());
  }

  Future<DriverProfile?> getDriver(String driverId) async {
    final doc = await _drivers.doc(driverId).get();
    if (!doc.exists) return null;
    return DriverProfile.fromFirestore(doc);
  }

  Future<void> assignDriverToZone(String driverId, String zoneId) async {
    await _drivers.doc(driverId).update({
      'assigned_zone': zoneId,
    });

    await _zones.doc(zoneId).update({
      'driver_ids': FieldValue.arrayUnion([driverId]),
    });
  }

  Future<void> removeDriverFromZone(String driverId, String zoneId) async {
    await _drivers.doc(driverId).update({
      'assigned_zone': FieldValue.delete(),
    });

    await _zones.doc(zoneId).update({
      'driver_ids': FieldValue.arrayRemove([driverId]),
    });
  }

  Future<void> assignDriverToShop(String driverId, String shopId) async {
    await _drivers.doc(driverId).update({
      'assigned_shop_id': shopId,
    });
  }

  Future<void> updateDriverLocation(String driverId, double lat, double lng) async {
    await _drivers.doc(driverId).update({
      'current_lat': lat,
      'current_lng': lng,
      'lastActive': FieldValue.serverTimestamp(),
    });
  }

  Future<void> updateDriverStatus(String driverId, DriverStatus status) async {
    await _drivers.doc(driverId).update({
      'status': status.name,
      'is_online': status == DriverStatus.online,
      'lastActive': FieldValue.serverTimestamp(),
    });
  }

  Future<void> assignOrderToDriver(String driverId, String orderId) async {
    await _drivers.doc(driverId).update({
      'current_order_id': orderId,
      'status': DriverStatus.busy.name,
    });
  }

  Future<void> completeOrderForDriver(String driverId, double earnings) async {
    await _drivers.doc(driverId).update({
      'current_order_id': FieldValue.delete(),
      'status': DriverStatus.online.name,
      'total_deliveries': FieldValue.increment(1),
      'total_earnings': FieldValue.increment(earnings),
      'lastActive': FieldValue.serverTimestamp(),
    });
  }

  Stream<List<DeliveryZone>> getZones() {
    return _zones
        .where('is_active', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs
            .map((doc) => DeliveryZone.fromFirestore(doc))
            .toList());
  }

  Future<DeliveryZone> createZone({
    required String name,
    required String description,
    required double centerLat,
    required double centerLng,
    required double radiusKm,
    List<String>? driverIds,
  }) async {
    final zone = DeliveryZone(
      id: '',
      name: name,
      description: description,
      centerLat: centerLat,
      centerLng: centerLng,
      radiusKm: radiusKm,
      driverIds: driverIds ?? [],
      isActive: true,
    );

    final docRef = await _zones.add(zone.toFirestore());
    final doc = await docRef.get();
    return DeliveryZone.fromFirestore(doc);
  }

  Future<void> updateZone(String zoneId, {
    String? name,
    String? description,
    double? centerLat,
    double? centerLng,
    double? radiusKm,
    bool? isActive,
  }) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['name'] = name;
    if (description != null) updates['description'] = description;
    if (centerLat != null) updates['center_lat'] = centerLat;
    if (centerLng != null) updates['center_lng'] = centerLng;
    if (radiusKm != null) updates['radius_km'] = radiusKm;
    if (isActive != null) updates['is_active'] = isActive;

    await _zones.doc(zoneId).update(updates);
  }

  Future<void> deleteZone(String zoneId) async {
    await _zones.doc(zoneId).delete();
  }

  Future<List<DriverProfile>> getNearbyDrivers(double lat, double lng, double radiusKm) async {
    final snapshot = await _drivers
        .where('is_online', isEqualTo: true)
        .get();

    final drivers = snapshot.docs
        .map((doc) => DriverProfile.fromFirestore(doc))
        .where((driver) {
          if (driver.currentLat == null || driver.currentLng == null) return false;
          final distance = _calculateDistance(
            lat, lng, driver.currentLat!, driver.currentLng!,
          );
          return distance <= radiusKm;
        }).toList();

    drivers.sort((a, b) {
      final distA = _calculateDistance(lat, lng, a.currentLat!, a.currentLng!);
      final distB = _calculateDistance(lat, lng, b.currentLat!, b.currentLng!);
      return distA.compareTo(distB);
    });

    return drivers;
  }

  double _calculateDistance(double lat1, double lng1, double lat2, double lng2) {
    const R = 6371;
    final dLat = (lat2 - lat1) * 3.141592653589793 / 180;
    final dLng = (lng2 - lng1) * 3.141592653589793 / 180;
    final a = (dLat / 2) * (dLat / 2) +
        (lat1 * 3.141592653589793 / 180) *
        (lat2 * 3.141592653589793 / 180) *
        (dLng / 2) * (dLng / 2);
    return R * 2 * (a > 1 ? 1.5707963267948966 : (a < 0 ? 0 : a.sqrt()));
  }
}

extension on double {
  double sqrt() {
    if (this < 0) return double.nan;
    if (this == 0) return 0;
    double x = this;
    for (int i = 0; i < 20; i++) {
      x = (x + this / x) / 2;
    }
    return x;
  }
}
