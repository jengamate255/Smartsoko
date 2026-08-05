import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/connectivity_service.dart';

/// Widget that displays a banner when the device is offline
/// 
/// Listens to ConnectivityService and shows/hides a banner
/// automatically based on network status
class OfflineIndicator extends StatelessWidget {
  const OfflineIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    final connectivityService = context.watch<ConnectivityService>();

    return StreamBuilder<bool>(
      stream: connectivityService.connectivityStream,
      initialData: true,
      builder: (context, snapshot) {
        final isConnected = snapshot.data ?? true;

        if (isConnected) {
          return const SizedBox.shrink();
        }

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
          color: Colors.red[700],
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.cloud_off,
                color: Colors.white,
                size: 20,
              ),
              const SizedBox(width: 8),
              const Text(
                'You are offline',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

/// Animated offline indicator with slide animation
class AnimatedOfflineIndicator extends StatelessWidget {
  const AnimatedOfflineIndicator({super.key});

  @override
  Widget build(BuildContext context) {
    final connectivityService = context.watch<ConnectivityService>();

    return StreamBuilder<bool>(
      stream: connectivityService.connectivityStream,
      initialData: true,
      builder: (context, snapshot) {
        final isConnected = snapshot.data ?? true;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeInOut,
          height: isConnected ? 0 : 40,
          child: AnimatedOpacity(
            duration: const Duration(milliseconds: 300),
            opacity: isConnected ? 0 : 1,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
              color: Colors.red[700],
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.cloud_off,
                    color: Colors.white,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'You are offline',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }
}
