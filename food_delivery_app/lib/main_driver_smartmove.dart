import 'package:flutter/material.dart';
import 'package:mapbox_maps_flutter/mapbox_maps_flutter.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config/app_config.dart';
import 'config/env_config.dart';
import 'services/auth_service.dart';
import 'services/location_service.dart';
import 'services/supabase_service.dart';
import 'screens/smartmove/driver/driver_dashboard_screen.dart';
import 'screens/smartmove/driver/driver_login_screen.dart';
import 'utils/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  try {
    await EnvConfig.load();
  } catch (e) {}

  MapboxOptions.accessToken = AppConfig.mapboxToken;

  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
  );

  runApp(const SmartMoveDriverApp());
}

class SmartMoveDriverApp extends StatelessWidget {
  const SmartMoveDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider(create: (_) => AuthService()),
        Provider(create: (_) => LocationService()),
        Provider(create: (_) => SupabaseService()),
      ],
      child: MaterialApp(
        title: 'LuxeRide Driver',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          scaffoldBackgroundColor: const Color(0xFF0b1326),
          colorScheme: ColorScheme.dark(
            primary: AppTheme.luxePrimary,
            secondary: AppTheme.luxeSecondary,
            surface: AppTheme.luxeSurface,
            error: AppTheme.luxeError,
            onSurface: AppTheme.luxeOnSurface,
          ),
          useMaterial3: true,
        ),
        home: const SmartMoveDriverLoginScreen(),
      ),
    );
  }
}
