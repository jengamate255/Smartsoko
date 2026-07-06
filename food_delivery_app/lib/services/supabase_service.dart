import 'package:supabase_flutter/supabase_flutter.dart';
import '../config/app_config.dart';
import '../utils/logger.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;
  SupabaseService._internal();

  bool _isInitialized = false;

  Future<void> initialize() async {
    if (_isInitialized) return;

    try {
      await Supabase.initialize(
        url: AppConfig.supabaseUrl,
        anonKey: AppConfig.supabaseAnonKey,
      );
      _isInitialized = true;
      AppLogger.info('Supabase initialized successfully');
    } catch (e) {
      AppLogger.error('Failed to initialize Supabase', e);
    }
  }

  SupabaseClient get client => Supabase.instance.client;

  // Generic method to check if Supabase is reachable
  Future<bool> isAvailable() async {
    try {
      final response = await client.from('restaurants').select('id').limit(1);
      return true;
    } catch (e) {
      AppLogger.warning('Supabase is not available: $e');
      return false;
    }
  }
}
