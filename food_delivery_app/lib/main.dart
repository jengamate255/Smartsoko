import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:google_fonts/google_fonts.dart';
import 'config/app_config.dart';
import 'config/env_config.dart';
import 'services/auth_service.dart';
import 'services/order_service.dart';
import 'services/payment_service.dart';
import 'services/location_service.dart';
import 'services/location_tracking_service.dart';
import 'services/restaurant_service.dart';
import 'services/connectivity_service.dart';
import 'services/supabase_service.dart';
import 'services/analytics_service.dart';
import 'screens/app_main_screen.dart';
import 'screens/app_login_screen.dart';
import 'widgets/role_aware_auth_wrapper.dart';
import 'utils/logger.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    // Load environment variables (optional for development)
    try {
      await EnvConfig.load();
    } catch (e) {
      AppLogger.warning('Environment file not loaded, using default config');
    }
    
    // Initialize Firebase
    await Firebase.initializeApp(
      options: FirebaseOptions(
        apiKey: AppConfig.firebaseConfig['apiKey'],
        authDomain: AppConfig.firebaseConfig['authDomain'],
        projectId: AppConfig.firebaseConfig['projectId'],
        storageBucket: AppConfig.firebaseConfig['storageBucket'],
        messagingSenderId: AppConfig.firebaseConfig['messagingSenderId'],
        appId: AppConfig.firebaseConfig['appId'],
        databaseURL: AppConfig.firebaseConfig['databaseURL'],
      ),
    );
    
    // Initialize Supabase
    final supabaseService = SupabaseService();
    await supabaseService.initialize();
    
    // Configure Crashlytics
    FlutterError.onError = (errorDetails) {
      FirebaseCrashlytics.instance.recordFlutterFatalError(errorDetails);
      AppLogger.fatal('Flutter error', errorDetails.exception, errorDetails.stack);
    };
    
    runApp(const MyApp());
  } catch (e, stackTrace) {
    AppLogger.fatal('Failed to initialize app', e, stackTrace);
    runApp(ErrorApp(error: e.toString()));
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider(create: (_) => AuthService()),
        Provider(create: (_) => OrderService()),
        Provider(create: (_) => PaymentService()),
        Provider(create: (_) => LocationService()),
        ProxyProvider<LocationService, LocationTrackingService>(
          update: (_, locationService, __) => LocationTrackingService(locationService),
        ),
        Provider(create: (_) => RestaurantService()),
        Provider(create: (_) => ConnectivityService()),
        Provider(create: (_) => SupabaseService()),
        Provider(create: (_) => AnalyticsService()),
      ],
      child: MaterialApp(
        title: AppConfig.appName,
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF064E3B)),
          useMaterial3: true,
          textTheme: GoogleFonts.plusJakartaSansTextTheme(),
        ),
        home: const RoleAwareAuthWrapper(
          loginScreen: AppLoginScreen(),
          mainScreen: AppMainScreen(),
        ),
      ),
    );
  }
}

class ErrorApp extends StatelessWidget {
  final String error;
  
  const ErrorApp({super.key, required this.error});
  
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.error_outline, size: 80, color: Colors.red),
                const SizedBox(height: 24),
                const Text(
                  'Failed to start app',
                  style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 12),
                Text(
                  error,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 16),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
