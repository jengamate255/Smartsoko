import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:smartsoko/models/restaurant.dart';
import 'supabase_service.dart';

/// Restaurant and menu data, backed by Supabase.
///
/// The app runs in Supabase-only mode, so these queries read from Supabase
/// directly rather than trying Firestore first and falling back.
///
/// The list accessors return a Stream (matching the old Firestore API), but
/// they are backed by one-shot fetches rather than Supabase Realtime: the
/// tables are not in the `supabase_realtime` publication, so a realtime
/// subscription would never emit.
class RestaurantService {
  final SupabaseService _supabaseService = SupabaseService();

  SupabaseClient get _client => _supabaseService.client;

  Stream<List<Restaurant>> getAllRestaurants() =>
      Stream.fromFuture(_fetchRestaurants());

  Stream<List<Restaurant>> getRestaurantsByCategory(String category) =>
      Stream.fromFuture(_fetchRestaurants(category: category));

  Future<List<Restaurant>> _fetchRestaurants({String? category}) async {
    var query = _client.from('restaurants').select().eq('is_open', true);
    if (category != null && category.isNotEmpty) {
      query = query.eq('category', category);
    }
    final rows = await query;
    return rows.map(Restaurant.fromMap).toList();
  }

  Future<Restaurant?> getRestaurant(String restaurantId) async {
    final row = await _client
        .from('restaurants')
        .select()
        .eq('id', restaurantId)
        .maybeSingle();
    if (row == null) return null;
    return Restaurant.fromMap(row);
  }

  Future<Restaurant?> getRestaurantByOwnerId(String ownerId) async {
    final rows = await _client
        .from('restaurants')
        .select()
        .eq('owner_id', ownerId)
        .limit(1);
    if (rows.isEmpty) return null;
    return Restaurant.fromMap(rows.first);
  }

  Stream<List<MenuItem>> getMenuItems(String restaurantId) =>
      Stream.fromFuture(_fetchMenuItems(restaurantId, onlyAvailable: true));

  Stream<List<MenuItem>> getAllMenuItems(String restaurantId) =>
      Stream.fromFuture(_fetchMenuItems(restaurantId));

  Future<List<MenuItem>> _fetchMenuItems(
    String restaurantId, {
    bool onlyAvailable = false,
  }) async {
    var query = _client
        .from('menu_items')
        .select()
        .eq('restaurant_id', restaurantId);
    if (onlyAvailable) {
      query = query.eq('is_available', true);
    }
    final rows = await query;
    return rows.map(MenuItem.fromMap).toList();
  }

  Future<MenuItem?> getMenuItem(String itemId) async {
    final row = await _client
        .from('menu_items')
        .select()
        .eq('id', itemId)
        .maybeSingle();
    if (row == null) return null;
    return MenuItem.fromMap(row);
  }

  Future<Restaurant> createRestaurant(Restaurant restaurant) async {
    final row = await _client
        .from('restaurants')
        .insert({
          'name': restaurant.name,
          'description': restaurant.description,
          'logo_url': restaurant.imageUrl,
          'address': restaurant.address,
          'latitude': restaurant.lat,
          'longitude': restaurant.lng,
          'category': restaurant.category,
          'rating': restaurant.rating,
          'delivery_time_minutes': restaurant.deliveryTimeMinutes,
          'delivery_fee': restaurant.deliveryFee,
          'is_open': restaurant.isOpen,
          if (restaurant.ownerId != null) 'owner_id': restaurant.ownerId,
        })
        .select()
        .single();
    return Restaurant.fromMap(row);
  }

  Future<MenuItem> createMenuItem(MenuItem item) async {
    final row = await _client
        .from('menu_items')
        .insert({
          'restaurant_id': item.restaurantId,
          'name': item.name,
          'description': item.description,
          'price': item.price,
          'category': item.category,
          'image_url': item.imageUrl,
          'is_available': item.isAvailable,
        })
        .select()
        .single();
    return MenuItem.fromMap(row);
  }

  Future<void> updateRestaurant(
    String restaurantId,
    Map<String, dynamic> updates,
  ) async {
    await _client
        .from('restaurants')
        .update(_toSnakeCase(updates))
        .eq('id', restaurantId);
  }

  Future<void> updateMenuItem(
    String itemId,
    Map<String, dynamic> updates,
  ) async {
    await _client
        .from('menu_items')
        .update(_toSnakeCase(updates))
        .eq('id', itemId);
  }

  Future<void> toggleRestaurantOpen(String restaurantId, bool isOpen) async {
    await _client
        .from('restaurants')
        .update({'is_open': isOpen})
        .eq('id', restaurantId);
  }

  Future<void> toggleMenuItemAvailability(
    String itemId,
    bool isAvailable,
  ) async {
    await _client
        .from('menu_items')
        .update({'is_available': isAvailable})
        .eq('id', itemId);
  }

  /// Callers pass camelCase maps (`{'imageUrl': ...}`); Supabase columns are
  /// snake_case, so convert the keys.
  Map<String, dynamic> _toSnakeCase(Map<String, dynamic> updates) {
    return updates.map(
      (key, value) => MapEntry(
        key.replaceAllMapped(
          RegExp(r'[A-Z]'),
          (match) => '_${match.group(0)!.toLowerCase()}',
        ),
        value,
      ),
    );
  }
}
