import 'dart:io';
import 'package:csv/csv.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../../models/restaurant.dart';
import '../../services/auth_service.dart';
import '../../services/restaurant_service.dart';

class CsvImportScreen extends StatefulWidget {
  final String restaurantId;

  const CsvImportScreen({super.key, required this.restaurantId});

  @override
  State<CsvImportScreen> createState() => _CsvImportScreenState();
}

class _CsvImportScreenState extends State<CsvImportScreen> {
  final RestaurantService _restaurantService = RestaurantService();
  final AuthService _authService = AuthService();

  List<List<dynamic>> _rows = [];
  List<String> _headers = [];
  String? _fileName;
  bool _isImporting = false;
  int _importedCount = 0;
  int _errorCount = 0;

  static const int _maxPreviewRows = 20;

  List<_CsvRowStatus> get _rowStatuses =>
      _rows.map((row) => _validateRow(row)).toList();

  int get _validCount => _rowStatuses.where((s) => s.isValid).length;
  int get _invalidCount => _rowStatuses.where((s) => !s.isValid).length;

  _CsvRowStatus _validateRow(List<dynamic> row) {
    final errors = <String>[];
    if (row.isEmpty || row[0].toString().trim().isEmpty) {
      errors.add('Missing name');
    }
    if (row.length > 2) {
      final price = double.tryParse(row[2].toString());
      if (price == null || price <= 0) {
        errors.add('Invalid price');
      }
    } else {
      errors.add('Missing price');
    }
    return _CsvRowStatus(isValid: errors.isEmpty, errors: errors);
  }

  Future<void> _pickCsvFile() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv'],
      );
      if (result == null || result.files.isEmpty) return;

      final file = result.files.first;
      String content;
      if (file.bytes != null) {
        content = String.fromCharCodes(file.bytes!);
      } else if (file.path != null) {
        content = await File(file.path!).readAsString();
      } else {
        return;
      }

      final rows = const CsvToListConverter().convert(
        content,
        shouldParseNumbers: false,
      );
      if (rows.isEmpty) return;

      setState(() {
        _headers = rows.first.map((h) => h.toString().trim()).toList();
        _rows = rows.skip(1).toList();
        _fileName = file.name;
        _importedCount = 0;
        _errorCount = 0;
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error reading CSV: $e')),
        );
      }
    }
  }

  Future<void> _importAll() async {
    setState(() => _isImporting = true);
    int imported = 0;
    int errors = 0;

    for (int i = 0; i < _rows.length; i++) {
      final status = _rowStatuses[i];
      if (!status.isValid) {
        errors++;
        continue;
      }

      try {
        final row = _rows[i];
        final name = row[0].toString().trim();
        final description = row.length > 1 ? row[1].toString().trim() : '';
        final price = double.tryParse(row[2].toString()) ?? 0;
        final category = row.length > 3 ? row[3].toString().trim() : 'General';
        final stock = row.length > 4 ? int.tryParse(row[4].toString()) ?? 0 : 0;
        final sku = row.length > 5 ? row[5].toString().trim() : null;

        final menuItem = MenuItem(
          id: '',
          restaurantId: widget.restaurantId,
          name: name,
          description: description,
          price: price,
          imageUrl: '',
          category: category.isNotEmpty ? category : 'General',
          isAvailable: stock > 0,
        );

        await _restaurantService.createMenuItem(menuItem);
        imported++;
      } catch (e) {
        errors++;
      }
    }

    if (mounted) {
      setState(() {
        _isImporting = false;
        _importedCount = imported;
        _errorCount = errors;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Imported $imported items ($errors errors)'),
          backgroundColor: imported > 0 ? Colors.green : Colors.red,
        ),
      );
    }
  }

  static String exportToCsv(List<MenuItem> items) {
    final rows = <List<dynamic>>[
      ['name', 'description', 'price', 'category', 'stock', 'sku'],
    ];
    for (final item in items) {
      final stock = item.variants.isNotEmpty
          ? item.variants.fold<int>(0, (sum, v) => sum + v.stock)
          : 0;
      final sku = item.variants.isNotEmpty ? item.variants.first.sku ?? '' : '';
      rows.add([
        item.name,
        item.description,
        item.price.toStringAsFixed(2),
        item.category,
        stock.toString(),
        sku,
      ]);
    }
    return const ListToCsvConverter().convert(rows);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Import Products'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Icon(Icons.info_outline, color: Colors.blue[700]),
                        const SizedBox(width: 8),
                        const Text(
                          'CSV Format',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Your CSV should have the following columns:',
                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.grey[100],
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Text(
                        'name, description, price, category, stock, sku',
                        style: TextStyle(
                          fontFamily: 'monospace',
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Required: name, price. Optional: description, category, stock, sku.',
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: _isImporting ? null : _pickCsvFile,
              icon: const Icon(Icons.upload_file),
              label: Text(_fileName != null ? '$_fileName (tap to change)' : 'Choose CSV File'),
              style: ElevatedButton.styleFrom(
                padding: const EdgeInsets.symmetric(vertical: 16),
                backgroundColor: const Color(0xFF064E3B),
                foregroundColor: Colors.white,
              ),
            ),
            if (_rows.isNotEmpty) ...[
              const SizedBox(height: 16),
              Row(
                children: [
                  _buildSummaryChip('$_validCount valid', Colors.green),
                  const SizedBox(width: 8),
                  _buildSummaryChip('$_invalidCount invalid', Colors.red),
                  const SizedBox(width: 8),
                  _buildSummaryChip('${_rows.length} total', Colors.grey),
                ],
              ),
              const SizedBox(height: 16),
              Card(
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: DataTable(
                    columns: [
                      const DataColumn(label: Text('#')),
                      for (final h in _headers.take(6))
                        DataColumn(label: Text(h)),
                      const DataColumn(label: Text('Status')),
                    ],
                    rows: List.generate(
                      _rows.length < _maxPreviewRows ? _rows.length : _maxPreviewRows,
                      (index) {
                        final row = _rows[index];
                        final status = _rowStatuses[index];
                        return DataRow(
                          color: WidgetStateProperty.resolveWith((states) {
                            if (!status.isValid) return Colors.red[50];
                            return null;
                          }),
                          cells: [
                            DataCell(Text('${index + 1}')),
                            for (int i = 0; i < 6; i++)
                              DataCell(
                                Text(
                                  i < row.length ? row[i].toString() : '',
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                            DataCell(
                              status.isValid
                                  ? const Icon(Icons.check_circle, color: Colors.green, size: 20)
                                  : Tooltip(
                                      message: status.errors.join('\n'),
                                      child: Icon(Icons.error, color: Colors.red[700], size: 20),
                                    ),
                            ),
                          ],
                        );
                      },
                    ),
                  ),
                ),
              ),
              if (_rows.length > _maxPreviewRows)
                Padding(
                  padding: const EdgeInsets.only(top: 8),
                  child: Text(
                    'Showing ${_maxPreviewRows} of ${_rows.length} rows',
                    style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    textAlign: TextAlign.center,
                  ),
                ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                onPressed: _isImporting || _validCount == 0 ? null : _importAll,
                icon: _isImporting
                    ? const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.cloud_upload),
                label: Text(
                  _isImporting
                      ? 'Importing...'
                      : 'Import $_validCount Products',
                ),
                style: ElevatedButton.styleFrom(
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  backgroundColor: const Color(0xFF064E3B),
                  foregroundColor: Colors.white,
                ),
              ),
            ],
            if (_importedCount > 0 || _errorCount > 0) ...[
              const SizedBox(height: 16),
              Card(
                color: Colors.green[50],
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    children: [
                      const Icon(Icons.check_circle, color: Colors.green, size: 48),
                      const SizedBox(height: 8),
                      Text(
                        'Import Complete',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.green[800],
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text('$_importedCount products imported successfully'),
                      if (_errorCount > 0)
                        Text(
                          '$_errorCount rows had errors',
                          style: TextStyle(color: Colors.red[700]),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 13, fontWeight: FontWeight.w600)),
    );
  }
}

class _CsvRowStatus {
  final bool isValid;
  final List<String> errors;
  const _CsvRowStatus({required this.isValid, required this.errors});
}
