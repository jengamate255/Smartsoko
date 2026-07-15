import 'package:flutter/material.dart';

class LocationInput extends StatelessWidget {
  final TextEditingController? controller;
  final String? hintText;
  final String? label;
  final IconData? leadingIcon;
  final Color? leadingIconColor;
  final Widget? trailing;
  final bool readOnly;
  final VoidCallback? onTap;
  final ValueChanged<String>? onChanged;
  final FocusNode? focusNode;

  const LocationInput({
    super.key,
    this.controller,
    this.hintText,
    this.label,
    this.leadingIcon,
    this.leadingIconColor,
    this.trailing,
    this.readOnly = false,
    this.onTap,
    this.onChanged,
    this.focusNode,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      decoration: BoxDecoration(
        color: theme.inputDecorationTheme.fillColor,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          if (leadingIcon != null)
            Padding(
              padding: const EdgeInsets.only(left: 16),
              child: Icon(
                leadingIcon,
                size: 20,
                color: leadingIconColor ?? Colors.grey.shade500,
              ),
            ),
          Expanded(
            child: TextField(
              controller: controller,
              focusNode: focusNode,
              readOnly: readOnly,
              onTap: onTap,
              onChanged: onChanged,
              decoration: InputDecoration(
                hintText: hintText,
                labelText: label,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 16,
                  vertical: 16,
                ),
              ),
            ),
          ),
          if (trailing != null)
            Padding(
              padding: const EdgeInsets.only(right: 8),
              child: trailing,
            ),
        ],
      ),
    );
  }
}
