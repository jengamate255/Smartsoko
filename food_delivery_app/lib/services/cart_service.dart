import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/restaurant.dart';

/// A single cart line — MenuItem snapshot + quantity.
/// The full item is stored so the cart screen and checkout render
/// names/prices even if the merchant edits the menu later.
class CartLine {
  final MenuItem item;
  int quantity;

  CartLine({required this.item, required this.quantity});

  double get lineTotal => item.price * quantity;

  Map<String, dynamic> toJson() => {
        'item': item.toJson(),
        'quantity': quantity,
      };

  static CartLine fromJson(Map<String, dynamic> j) => CartLine(
        item: MenuItem.fromJson(j['item']),
        quantity: (j['quantity'] as num).toInt(),
      );
}

/// App-wide persistent cart (survives navigation AND app restarts via
/// SharedPreferences). One restaurant at a time — adding an item from a
/// different restaurant prompts the caller to clear first.
class CartService extends ChangeNotifier {
  static const _prefsKey = 'smartsoko_cart_v1';

  String? _restaurantId;
  String? _restaurantName;
  double _restaurantDeliveryFee = 0;
  final Map<String, CartLine> _lines = {};

  String? get restaurantId => _restaurantId;
  String? get restaurantName => _restaurantName;
  double get restaurantDeliveryFee => _restaurantDeliveryFee;
  bool get isEmpty => _lines.isEmpty;
  int get itemCount => _lines.values.fold(0, (s, l) => s + l.quantity);
  int get lineCount => _lines.length;

  double get subtotal => _lines.values.fold(0.0, (s, l) => s + l.lineTotal);
  double get total => subtotal + _restaurantDeliveryFee;

  List<CartLine> get lines => List.unmodifiable(_lines.values);
  int quantityOf(String itemId) => _lines[itemId]?.quantity ?? 0;

  /// true if the item can be added without switching restaurants.
  bool canAdd(String restaurantId) =>
      isEmpty || _restaurantId == restaurantId;

  /// Set the restaurant context (called when the cart is empty or cleared).
  void setRestaurant(Restaurant restaurant) {
    _restaurantId = restaurant.id;
    _restaurantName = restaurant.name;
    _restaurantDeliveryFee = restaurant.deliveryFee;
    _save();
  }

  void addItem(Restaurant restaurant, MenuItem item, {int quantity = 1}) {
    if (!isEmpty && _restaurantId != restaurant.id) {
      // Caller must clearCart() first — don't silently mix restaurants.
      return;
    }
    if (isEmpty) {
      _restaurantId = restaurant.id;
      _restaurantName = restaurant.name;
      _restaurantDeliveryFee = restaurant.deliveryFee;
    }
    final existing = _lines[item.id];
    if (existing != null) {
      existing.quantity += quantity;
    } else {
      _lines[item.id] = CartLine(item: item, quantity: quantity);
    }
    _save();
    notifyListeners();
  }

  void decrement(String itemId) {
    final line = _lines[itemId];
    if (line == null) return;
    line.quantity--;
    if (line.quantity <= 0) _lines.remove(itemId);
    if (_lines.isEmpty) _clearRestaurant();
    _save();
    notifyListeners();
  }

  void removeItem(String itemId) {
    _lines.remove(itemId);
    if (_lines.isEmpty) _clearRestaurant();
    _save();
    notifyListeners();
  }

  void clearCart() {
    _lines.clear();
    _clearRestaurant();
    _save();
    notifyListeners();
  }

  void _clearRestaurant() {
    _restaurantId = null;
    _restaurantName = null;
    _restaurantDeliveryFee = 0;
  }

  // ── persistence ────────────────────────────────────────────────────────
  Future<void> _save() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final payload = {
        'restaurantId': _restaurantId,
        'restaurantName': _restaurantName,
        'deliveryFee': _restaurantDeliveryFee,
        'lines': _lines.values.map((l) => l.toJson()).toList(),
      };
      await prefs.setString(_prefsKey, jsonEncode(payload));
    } catch (e) {
      debugPrint('CartService save error: $e');
    }
  }

  Future<void> loadSavedCart() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_prefsKey);
      if (raw == null || raw.isEmpty) return;
      final payload = jsonDecode(raw) as Map<String, dynamic>;
      _restaurantId = payload['restaurantId'] as String?;
      _restaurantName = payload['restaurantName'] as String?;
      _restaurantDeliveryFee =
          ((payload['deliveryFee'] as num?) ?? 0).toDouble();
      _lines.clear();
      for (final l in (payload['lines'] as List? ?? [])) {
        final line = CartLine.fromJson(l as Map<String, dynamic>);
        _lines[line.item.id] = line;
      }
      notifyListeners();
    } catch (e) {
      debugPrint('CartService load error: $e');
    }
  }
}
