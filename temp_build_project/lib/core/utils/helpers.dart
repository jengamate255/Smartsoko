import 'package:flutter/material.dart';
import 'package:fluttertoast/fluttertoast.dart';
import 'package:intl/intl.dart';
import 'package:shimmer/shimmer.dart';

import '../constants/app_constants.dart';

String formatPrice(double amount) {
  final formatter = NumberFormat.currency(
    symbol: AppConstants.currencySymbol,
    decimalDigits: 2,
  );
  return formatter.format(amount);
}

String formatDate(DateTime date, {String? pattern}) {
  final formatter = DateFormat(pattern ?? 'MMM dd, yyyy - hh:mm a');
  return formatter.format(date);
}

String formatRelativeTime(DateTime date) {
  final now = DateTime.now();
  final diff = now.difference(date);

  if (diff.inSeconds < 60) return 'Just now';
  if (diff.inMinutes < 60) return '${diff.inMinutes}m ago';
  if (diff.inHours < 24) return '${diff.inHours}h ago';
  if (diff.inDays < 7) return '${diff.inDays}d ago';
  return formatDate(date, pattern: 'MMM dd');
}

void showToast(String message, {bool isError = false}) {
  Fluttertoast.showToast(
    msg: message,
    toastLength: Toast.LENGTH_SHORT,
    gravity: ToastGravity.BOTTOM,
    backgroundColor: isError ? Colors.red.shade700 : Colors.black87,
    textColor: Colors.white,
    fontSize: 14,
  );
}

Future<T?> showLoadingIndicator<T>(BuildContext context, {String? message}) {
  return showDialog<T>(
    context: context,
    barrierDismissible: false,
    builder: (ctx) => PopScope(
      canPop: false,
      child: Center(
        child: Container(
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            color: Theme.of(context).scaffoldBackgroundColor,
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.1),
                blurRadius: 20,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const CircularProgressIndicator(),
              if (message != null) ...[
                const SizedBox(height: 16),
                Text(message, style: Theme.of(context).textTheme.bodyMedium),
              ],
            ],
          ),
        ),
      ),
    ),
  );
}

Widget buildShimmerPlaceholder({
  double width = double.infinity,
  double height = 16,
  double radius = 8,
}) {
  return Shimmer.fromColors(
    baseColor: Colors.grey.shade300,
    highlightColor: Colors.grey.shade100,
    child: Container(
      width: width,
      height: height,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(radius),
      ),
    ),
  );
}

String maskPhoneNumber(String phone) {
  if (phone.length < 7) return phone;
  return phone.substring(0, 3) +
      '****' +
      phone.substring(phone.length - 3);
}

String initials(String fullName) {
  if (fullName.isEmpty) return '?';
  final parts = fullName.trim().split(RegExp(r'\s+'));
  if (parts.length == 1) return parts[0][0].toUpperCase();
  return '${parts[0][0]}${parts.last[0]}'.toUpperCase();
}

double calculateDistance(double lat1, double lng1, double lat2, double lng2) {
  const double earthRadius = 6371;
  final double dLat = _toRadians(lat2 - lat1);
  final double dLng = _toRadians(lng2 - lng1);
  final double a = _sinSquared(dLat / 2) +
      _cos(_toRadians(lat1)) * _cos(_toRadians(lat2)) * _sinSquared(dLng / 2);
  final double c = 2 * _asin(_sqrt(a));
  return earthRadius * c;
}

double _toRadians(double degree) => degree * (3.141592653589793 / 180);
double _sinSquared(double x) {
  final s = _sin(x);
  return s * s;
}
double _sin(double x) => x - (x * x * x) / 6 + (x * x * x * x * x) / 120;
double _cos(double x) => 1 - (x * x) / 2 + (x * x * x * x) / 24;
double _asin(double x) {
  if (x.abs() > 1) return 0;
  return x + (x * x * x) / 6 + (3 * x * x * x * x * x) / 40;
}
double _sqrt(double x) {
  if (x <= 0) return 0;
  double z = x / 2;
  for (int i = 0; i < 10; i++) {
    z = (z + x / z) / 2;
  }
  return z;
}
