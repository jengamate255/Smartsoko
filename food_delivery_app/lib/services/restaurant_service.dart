import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/restaurant.dart';
import '../config/app_config.dart';
import 'supabase_service.dart';
import 'connectivity_service.dart';
import '../utils/logger.dart';

class RestaurantService {
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final SupabaseService _supabaseService = SupabaseService();
  final ConnectivityService _connectivityService = ConnectivityService();

  CollectionReference get _restaurants => _firestore.collection(AppConfig.restaurantsCollection);
  CollectionReference get _menuItems => _firestore.collection(AppConfig.menuItemsCollection);

  Stream<List<Restaurant>> getAllRestaurants() {
    // try Firebase first, fallback to Supabase if needed
    return _restaurants
        .where('isOpen', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => Restaurant.fromFirestore(doc)).toList())
        .handleError((error) async* {
          AppLogger.warning('Firebase failed, falling back to Supabase: $error');
          final supabaseData = await _supabaseService.client
              .from('restaurants')
              .select()
              .eq('is_open', true);
          
          yield (supabaseData as List).map((data) => Restaurant.fromMap(data)).toList();
        });
  }

  Stream<List<Restaurant>> getRestaurantsByCategory(String category) {
    return _restaurants
        .where('category', isEqualTo: category)
        .where('isOpen', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => Restaurant.fromFirestore(doc)).toList());
  }

  Future<Restaurant?> getRestaurant(String restaurantId) async {
    final doc = await _restaurants.doc(restaurantId).get();
    if (!doc.exists) return null;
    return Restaurant.fromFirestore(doc);
  }

  Future<Restaurant?> getRestaurantByOwnerId(String ownerId) async {
    final docs = await _restaurants
        .where('ownerId', isEqualTo: ownerId)
        .limit(1)
        .get();
    if (docs.docs.isEmpty) return null;
    return Restaurant.fromFirestore(docs.docs.first);
  }

  Stream<List<MenuItem>> getMenuItems(String restaurantId) {
    return _menuItems
        .where('restaurantId', isEqualTo: restaurantId)
        .where('isAvailable', isEqualTo: true)
        .snapshots()
        .map((snapshot) => snapshot.docs.map((doc) => MenuItem.fromFirestore(doc)).toList());
  }

  Future<MenuItem?> getMenuItem(String itemId) async {
    final doc = await _menuItems.doc(itemId).get();
    if (!doc.exists) return null;
    return MenuItem.fromFirestore(doc);
  }

  Future<Restaurant> createRestaurant(Restaurant restaurant) async {
    final docRef = await _restaurants.add(restaurant.toFirestore());
    final doc = await docRef.get();
    return Restaurant.fromFirestore(doc);
  }

  Future<MenuItem> createMenuItem(MenuItem item) async {
    final docRef = await _menuItems.add(item.toFirestore());
    final doc = await docRef.get();
    return MenuItem.fromFirestore(doc);
  }

  Future<void> updateRestaurant(String restaurantId, Map<String, dynamic> updates) async {
    await _restaurants.doc(restaurantId).update(updates);
  }

  Future<void> updateMenuItem(String itemId, Map<String, dynamic> updates) async {
    await _menuItems.doc(itemId).update(updates);
  }

  Future<void> toggleRestaurantOpen(String restaurantId, bool isOpen) async {
    await _restaurants.doc(restaurantId).update({'isOpen': isOpen});
  }

  Future<void> toggleMenuItemAvailability(String itemId, bool isAvailable) async {
    await _menuItems.doc(itemId).update({'isAvailable': isAvailable});
  }
}
