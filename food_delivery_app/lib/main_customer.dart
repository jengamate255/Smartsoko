import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_crashlytics/firebase_crashlytics.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'config/app_config.dart';
import 'config/env_config.dart';
import 'services/auth_service.dart';
import 'services/order_service.dart';
import 'services/payment_service.dart';
import 'services/location_service.dart';
import 'services/restaurant_service.dart';
import 'services/connectivity_service.dart';
import 'services/analytics_service.dart';
import 'screens/customer/login_screen.dart';
import 'screens/customer/main_screen.dart';
import 'utils/logger.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  // Set app configuration for Customer App
  AppConfig.setAppType('customer');
  
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
    
    // Configure Firestore offline persistence
    FirebaseFirestore.instance.settings = const Settings(
      persistenceEnabled: true,
      cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
    );
    
    // Configure Crashlytics
    FlutterError.onError = (errorDetails) {
      FirebaseCrashlytics.instance.recordFlutterFatalError(errorDetails);
      AppLogger.fatal('Flutter error', errorDetails.exception, errorDetails.stack);
    };
    
    runApp(const CustomerApp());
  } catch (e, stackTrace) {
    AppLogger.fatal('Failed to initialize app', e, stackTrace);
    runApp(ErrorApp(error: e.toString()));
  }
}

class CustomerApp extends StatelessWidget {
  const CustomerApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        Provider(create: (_) => AuthService()),
        Provider(create: (_) => OrderService()),
        Provider(create: (_) => PaymentService()),
        Provider(create: (_) => LocationService()),
        Provider(create: (_) => RestaurantService()),
        Provider(create: (_) => ConnectivityService()),
        Provider(create: (_) => AnalyticsService()),
      ],
      child: MaterialApp(
        title: 'Food Delivery - Customer',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: Colors.orange),
          useMaterial3: true,
        ),
        home: const AuthWrapper(),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    final authService = context.read<AuthService>();
    
    return StreamBuilder(
      stream: authService.authStateChanges,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        
        if (snapshot.hasData) {
          // Set Crashlytics user ID and role for crash reporting
          final user = snapshot.data;
          FirebaseCrashlytics.instance.setUserIdentifier(user.id);
          FirebaseCrashlytics.instance.setCustomKey('role', user.role.name);
          FirebaseCrashlytics.instance.setCustomKey('app_type', 'customer');
          return const MainScreen();
        }
        
        return const LoginScreen();
      },
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
