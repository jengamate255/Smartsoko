import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

/// Export only the records currently loaded by the screen, without hidden fields.
Future<void> showCsvExport(BuildContext context, String title,
    List<Map<String, dynamic>> rows, Map<String, String> columns) async {
  String cell(dynamic value) {
    var text = value == null ? '' : value is Map || value is List ? jsonEncode(value) : value.toString();
    if (RegExp(r'^\s*[=+@-]').hasMatch(text)) text = "'$text";
    return '"${text.replaceAll('"', '""')}"';
  }
  final csv = [columns.values.map(cell).join(','),
    ...rows.map((row) => columns.keys.map((key) => cell(row[key])).join(','))].join('\r\n');
  await showDialog<void>(context: context, builder: (dialogContext) => AlertDialog(
    title: Text(title),
    content: Text('${rows.length} loaded records. Copy the CSV and paste it into a spreadsheet or save it as a .csv file.'),
    actions: [TextButton(onPressed: () => Navigator.pop(dialogContext), child: const Text('Close')),
      FilledButton(onPressed: () async {
        await Clipboard.setData(ClipboardData(text: csv));
        if (dialogContext.mounted) Navigator.pop(dialogContext);
        if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('CSV copied to clipboard')));
      }, child: const Text('Copy CSV'))],
  ));
}
