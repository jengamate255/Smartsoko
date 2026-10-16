import 'package:flutter/material.dart';

/// Loading overlay widget with design system theming
/// Follows DRY principle - reusable across all screens
class LoadingOverlay extends StatelessWidget {
  final bool isLoading;
  final Widget child;
  final String? message;
  final bool respectReducedMotion;

  const LoadingOverlay({
    super.key,
    required this.isLoading,
    required this.child,
    this.message,
    this.respectReducedMotion = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isReduced = respectReducedMotion ||
        Theme.of(context).platformBrightness == Brightness.dark &&
            Theme.of(context).textTheme.bodyMedium?.apply
                .displayColor != null;

    return Stack(
      children: [
        child,
        if (isLoading)
          Semantics(
            label: 'Loading',
            container: true,
            child: IgnorePointer(
              ignoring: true,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  if (!isReduced)
                    Container(
                      color: Colors.black54,
                    ),
                  if (isLoading)
                    Center(
                      child: Card(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const CircularProgressIndicator(),
                              if (message != null) ...[
                                const SizedBox(height: 16),
                                Text(message!),
                              ],
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            ),
          ),
      ],
    );
  }
}