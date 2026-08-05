import 'package:flutter/material.dart';

class AppColors {
  AppColors._();

  static const Color primary = Color(0xFF1A73E8);
  static const Color primaryDark = Color(0xFF1557B0);
  static const Color primaryLight = Color(0xFF4A90E2);

  static const Color secondary = Color(0xFF00BFA5);
  static const Color secondaryDark = Color(0xFF009688);
  static const Color secondaryLight = Color(0xFF64FFDA);

  static const Color background = Color(0xFFF8F9FA);
  static const Color surface = Colors.white;
  static const Color darkBackground = Color(0xFF121212);
  static const Color darkSurface = Color(0xFF1E1E1E);

  static const Color textPrimary = Color(0xFF1D1D1F);
  static const Color textSecondary = Color(0xFF6E6E73);
  static const Color textHint = Color(0xFFA1A1A6);
  static const Color textOnPrimary = Colors.white;

  static const Color darkTextPrimary = Color(0xFFF5F5F7);
  static const Color darkTextSecondary = Color(0xFFA1A1A6);
  static const Color darkTextHint = Color(0xFF6E6E73);

  static const Color success = Color(0xFF34C759);
  static const Color warning = Color(0xFFFF9500);
  static const Color error = Color(0xFFFF3B30);
  static const Color info = Color(0xFF007AFF);

  static const Color divider = Color(0xFFE5E5EA);
  static const Color darkDivider = Color(0xFF38383A);
  static const Color border = Color(0xFFD1D1D6);
  static const Color darkBorder = Color(0xFF48484A);

  static const Color shimmerBase = Color(0xFFE0E0E0);
  static const Color shimmerHighlight = Color(0xFFF5F5F5);
  static const Color darkShimmerBase = Color(0xFF3A3A3C);
  static const Color darkShimmerHighlight = Color(0xFF48484A);

  static const Color ratingStar = Color(0xFFFFC107);
  static const Color online = Color(0xFF34C759);
  static const Color offline = Color(0xFF8E8E93);

  static const LinearGradient primaryGradient = LinearGradient(
    colors: [primary, primaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient accentGradient = LinearGradient(
    colors: [secondary, secondaryLight],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
}
