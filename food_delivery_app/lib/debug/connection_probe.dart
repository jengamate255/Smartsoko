import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:smartsoko/config/app_config.dart';
import 'package:smartsoko/config/env_config.dart';

/// Read-only connectivity probe. Run on Android with:
/// flutter run -t lib/debug/connection_probe.dart --no-resident
Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final results = <String>[];
  final client = http.Client();
  try {
    await EnvConfig.load();
    final base = AppConfig.apiBaseUrl.replaceFirst(RegExp(r'/$'), '');
    Future<dynamic> read(String url, {Map<String, String>? headers}) async {
      final response = await client.get(Uri.parse(url), headers: headers)
          .timeout(const Duration(seconds: 10));
      if (response.statusCode != 200) throw Exception('HTTP ${response.statusCode}');
      return jsonDecode(response.body);
    }

    final health = await read('$base/health') as Map<String, dynamic>;
    results.add('Backend: ${health['data']['overall']}');
    final web = await read('$base/products?limit=20') as Map<String, dynamic>;
    final products = web['data'] as List;
    results.add('Web catalog: ${products.length} products');

    final headers = {
      'apikey': AppConfig.supabaseAnonKey,
      'Authorization': 'Bearer ${AppConfig.supabaseAnonKey}',
    };
    final rows = await read('${AppConfig.supabaseUrl}/rest/v1/products?select=id&limit=1000', headers: headers) as List;
    final ids = rows.map((row) => row['id']).toSet();
    final matching = products.where((product) => ids.contains(product['id'])).length;
    results.add('Same Supabase catalog: $matching/${products.length} web products matched');
    final restaurants = await read('${AppConfig.supabaseUrl}/rest/v1/restaurants?select=id&is_open=eq.true&limit=1000', headers: headers) as List;
    results.add('Flutter restaurant catalog: ${restaurants.length} open restaurants');
    results.add('PASS: Android can reach the web backend and shared database');
  } catch (error) {
    results.add('FAIL: $error');
  } finally {
    client.close();
  }
  for (final result in results) {
    debugPrint('SMARTSOKO_CONNECTION: $result');
  }
  runApp(MaterialApp(home: Scaffold(
    appBar: AppBar(title: const Text('SmartSoko connection check')),
    body: Padding(padding: const EdgeInsets.all(24), child: Text(results.join('\n\n'))),
  )));
}
