import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:smartsoko/services/connectivity_service.dart';

/// Base offline indicator widget with consistent design system styling
/// Used by both OfflineIndicator and AnimatedOfflineIndicator
class _OfflineBase extends StatelessWidget {
  final bool animate;
  final Duration duration;
  final Curve curve;

  const _OfflineBase({
    super.key,
    this.animate = true,
    this.duration = const Duration(milliseconds: 300),
    this.curve = Curves.easeInOut,
  });

  @override
  Widget build(BuildContext context) {
    final connectivityService = context.watch<ConnectivityService>();
    final isConnected = connectivityService.isConnected ?? true;
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    final effectiveColor = animate ? colorScheme.error : colorScheme.onSurface;
    final effectivePadding = const EdgeInsets.symmetric(vertical: 8, horizontal: 16);

    if (isConnected) {
      return const SizedBox.shrink();
    }

    if (animate) {
      return AnimatedOpacity(
        duration: duration,
        curve: curve,
        opacity: 1,
        child: AnimatedContainer(
          duration: duration,
          curve: curve,
          height: 40,
          width: double.infinity,
          padding: effectivePadding,
          color: effectiveColor,
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.cloud_off,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 8),
              Text(
                'You are offline',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
      );
    }

    return Container(
      width: double.infinity,
      padding: effectivePadding,
      color: effectiveColor,
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(
            Icons.cloud_off,
            color: Colors.white,
            size: 20,
          ),
          const SizedBox(width: 8),
          Text(
            'You are offline',
            style: TextStyle(
              color: Colors.white,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

/// Widget that displays a banner when the device is offline
/// Listens to ConnectivityService and shows/hides a banner
/// automatically based on network status
class OfflineIndicator extends StatelessWidget {
  const OfflineIndicator({super.key});

  @override
  Widget build(BuildContext context) => const _OfflineBase(animate: false);
}

/// Animated offline indicator with fade-in/fade-out animation
class AnimatedOfflineIndicator extends StatelessWidget {
  const AnimatedOfflineIndicator({super.key});

  @override
  Widget build(BuildContext context) => const _OfflineBase(animate: true);
}