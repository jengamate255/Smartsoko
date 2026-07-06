import 'package:geolocator/geolocator.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/rider.dart';
import '../config/app_config.dart';

class LocationService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;

  CollectionReference get _riders => _firestore.collection(AppConfig.ridersCollection);

  Future<bool> checkPermission() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      return false;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        return false;
      }
    }

    if (permission == LocationPermission.deniedForever) {
      return false;
    }

    return true;
  }

  Future<Position?> getCurrentPosition() async {
    final hasPermission = await checkPermission();
    if (!hasPermission) return null;

    return await Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
      ),
    );
  }

  Future<void> updateRiderLocation(String riderId, double lat, double lng, {bool isOnline = true}) async {
    await _riders.doc(riderId).set({
      'lat': lat,
      'lng': lng,
      'updatedAt': FieldValue.serverTimestamp(),
      'isOnline': isOnline,
    }, SetOptions(merge: true));
  }

  Stream<RiderLocation?> getRiderLocationStream(String riderId) {
    return _riders.doc(riderId).snapshots().map((doc) {
      if (!doc.exists) return null;
      return RiderLocation.fromFirestore(doc);
    });
  }

  Future<List<RiderLocation>> getNearbyRiders(double lat, double lng, double radiusKm) async {
    // Simple implementation - in production use Geohash for better performance
    final snapshot = await _riders.where('isOnline', isEqualTo: true).get();
    
    return snapshot.docs
        .map((doc) => RiderLocation.fromFirestore(doc))
        .where((rider) {
          final distance = Geolocator.distanceBetween(
            rider.lat, rider.lng, lat, lng
          ) / 1000; // Convert to km
          return distance <= radiusKm;
        })
        .toList();
  }

  double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
    return Geolocator.distanceBetween(lat1, lng1, lat2, lng2) / 1000;
  }

  double calculateDeliveryFee(double distance, {double baseFee = 500, double perKm = 100}) {
    return baseFee + (distance * perKm);
  }
}
