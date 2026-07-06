import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ThemeService extends ChangeNotifier {
  static const String _themeKey = 'app_theme_mode';
  ThemeMode _themeMode = ThemeMode.system;

  ThemeMode get themeMode => _themeMode;
  bool get isDarkMode => _themeMode == ThemeMode.dark;

  ThemeService() {
    _loadTheme();
  }

  Future<void> _loadTheme() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final themeString = prefs.getString(_themeKey);
      if (themeString != null) {
        _themeMode = ThemeMode.values.firstWhere(
          (e) => e.name == themeString,
          orElse: () => ThemeMode.system,
        );
        notifyListeners();
      }
    } catch (e) {
      // Use default
    }
  }

  Future<void> setThemeMode(ThemeMode mode) async {
    _themeMode = mode;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_themeKey, mode.name);
    } catch (e) {
      // Ignore
    }
    notifyListeners();
  }

  Future<void> toggleTheme() async {
    _themeMode = isDarkMode ? ThemeMode.light : ThemeMode.dark;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_themeKey, _themeMode.name);
    } catch (e) {
      // Ignore
    }
    notifyListeners();
  }

  static ThemeData get lightTheme {
    return ThemeData(
      brightness: Brightness.light,
      primaryColor: const Color(0xFF064e3b),
      colorScheme: ColorScheme.light(
        primary: const Color(0xFF064e3b),
        secondary: const Color(0xFF10b981),
        surface: Colors.white,
        error: const Color(0xFFf43f5e),
      ),
      scaffoldBackgroundColor: const Color(0xFFFBF9F5),
      appBarTheme: const AppBarTheme(
        backgroundColor: Colors.white,
        foregroundColor: Color(0xFF064e3b),
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: Colors.white,
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: Colors.grey[100],
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF064e3b),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Color(0xFF064e3b)),
        headlineMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Color(0xFF064e3b)),
        titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF064e3b)),
        titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Color(0xFF064e3b)),
        bodyLarge: TextStyle(fontSize: 16, color: Color(0xFF1f2937)),
        bodyMedium: TextStyle(fontSize: 14, color: Color(0xFF4b5563)),
        bodySmall: TextStyle(fontSize: 12, color: Color(0xFF6b7280)),
      ),
    );
  }

  static ThemeData get darkTheme {
    return ThemeData(
      brightness: Brightness.dark,
      primaryColor: const Color(0xFF10b981),
      colorScheme: ColorScheme.dark(
        primary: const Color(0xFF10b981),
        secondary: const Color(0xFF064e3b),
        surface: const Color(0xFF1f2937),
        error: const Color(0xFFf43f5e),
      ),
      scaffoldBackgroundColor: const Color(0xFF0f172a),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF1f2937),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      cardTheme: CardThemeData(
        color: const Color(0xFF1f2937),
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: const Color(0xFF374151),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF10b981),
          foregroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        ),
      ),
      textTheme: const TextTheme(
        headlineLarge: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: Colors.white),
        headlineMedium: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
        titleLarge: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white),
        titleMedium: TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.white),
        bodyLarge: TextStyle(fontSize: 16, color: Color(0xFFe5e7eb)),
        bodyMedium: TextStyle(fontSize: 14, color: Color(0xFFd1d5db)),
        bodySmall: TextStyle(fontSize: 12, color: Color(0xFF9ca3af)),
      ),
    );
  }
}
