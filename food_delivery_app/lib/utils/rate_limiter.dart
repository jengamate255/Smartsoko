import 'dart:io';
import 'package:shared_preferences/shared_preferences.dart';

/// Rate limiter to prevent brute force attacks
class RateLimiter {
  static const int _maxAttempts = 5;
  static const Duration _lockoutDuration = Duration(minutes: 15);
  static const String _attemptsKey = 'auth_attempts_';
  static const String _lockoutKey = 'auth_lockout_';

  /// Check if the IP is currently locked out
  static Future<bool> isLockedOut(String identifier) async {
    final prefs = await SharedPreferences.getInstance();
    final lockoutTime = prefs.getInt('${_lockoutKey}$identifier') ?? 0;
    final now = DateTime.now().millisecondsSinceEpoch;
    
    if (lockoutTime > now) {
      return true;
    }
    
    // Clear expired lockout
    if (lockoutTime > 0 && lockoutTime <= now) {
      await prefs.remove('${_lockoutKey}$identifier');
      await prefs.remove('${_attemptsKey}$identifier');
    }
    
    return false;
  }

  /// Record an authentication attempt
  static Future<void> recordAttempt(String identifier, bool success) async {
    final prefs = await SharedPreferences.getInstance();
    
    if (success) {
      // Clear attempts on successful login
      await prefs.remove('${_attemptsKey}$identifier');
      await prefs.remove('${_lockoutKey}$identifier');
      return;
    }
    
    final attempts = prefs.getInt('${_attemptsKey}$identifier') ?? 0;
    final newAttempts = attempts + 1;
    
    await prefs.setInt('${_attemptsKey}$identifier', newAttempts);
    
    // Lock out if max attempts reached
    if (newAttempts >= _maxAttempts) {
      final lockoutTime = DateTime.now()
          .add(_lockoutDuration)
          .millisecondsSinceEpoch;
      await prefs.setInt('${_lockoutKey}$identifier', lockoutTime);
    }
  }

  /// Get remaining attempts
  static Future<int> getRemainingAttempts(String identifier) async {
    final prefs = await SharedPreferences.getInstance();
    final attempts = prefs.getInt('${_attemptsKey}$identifier') ?? 0;
    return (_maxAttempts - attempts).clamp(0, _maxAttempts);
  }
}