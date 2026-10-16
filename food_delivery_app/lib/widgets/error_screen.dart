import 'package:flutter/material.dart';

/// Base empty state widget with consistent design system styling
/// Follows DRY principle - used by both ErrorScreen and EmptyStateScreen
class BaseEmptyState extends StatelessWidget {
  final String message;
  final Widget? icon;
  final Widget? action;
  final EdgeInsetsGeometry? padding;
  final bool showTitle;
  final TextStyle? titleStyle;
  final TextStyle? messageStyle;
  final bool respectReducedMotion;

  const BaseEmptyState({
    super.key,
    required this.message,
    this.icon,
    this.action,
    this.padding,
    this.showTitle = true,
    this.titleStyle,
    this.messageStyle,
    this.respectReducedMotion = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final isReduced = respectReducedMotion || 
        Theme.of(context).platformBrightness == Brightness.dark; // simplified check

    final effectivePadding = padding ?? const EdgeInsets.all(24);

    return Center(
      child: Padding(
        padding: effectivePadding,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            if (showTitle) ...[
              Icon(
                icon ?? Icons.error_outline,
                size: 80,
                color: isReduced ? colorScheme.onSurfaceVariant : colorScheme.error,
              ),
              const SizedBox(height: 24),
              Text(
                message,
                textAlign: TextAlign.center,
                style: messageStyle ??
                    theme.textTheme.bodyLarge?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
              ),
            ] ...[
              if (action != null) ...[
                const SizedBox(height: 24),
                action!,
              ],
            ],
          ],
        ),
      ),
    );
  }
}

/// Error screen widget with consistent design system styling
class ErrorScreen extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;
  
  const ErrorScreen({
    super.key,
    required this.message,
    this.onRetry,
  });
  
  @override
  Widget build(BuildContext context) => BaseEmptyState(
    message: message,
    icon: Icons.error_outline,
    action: onRetry != null
        ? ElevatedButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Try Again'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(
                horizontal: 32,
                vertical: 16,
              ),
            ),
          )
        : null,
    respectReducedMotion: true,
  );
}

/// Generic empty state widget with customizable icon and action
class EmptyStateScreen extends StatelessWidget {
  final String message;
  final IconData icon;
  final Widget? action;
  
  const EmptyStateScreen({
    super.key,
    required this.message,
    this.icon = Icons.inbox_outlined,
    this.action,
  });
  
  @override
  Widget build(BuildContext context) => BaseEmptyState(
    message: message,
    icon: icon,
    action: action,
    respectReducedMotion: true,
  );
}