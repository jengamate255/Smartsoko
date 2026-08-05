import 'package:flutter/material.dart';
import 'screens/smartmove/web/landing_screen.dart';
import 'utils/app_theme.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const SmartMoveWebApp());
}

class SmartMoveWebApp extends StatelessWidget {
  const SmartMoveWebApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'LuxeRide | Executive Travel',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: const Color(0xFF0c0e12),
        colorScheme: ColorScheme.dark(
          primary: AppTheme.luxePrimary,
          secondary: AppTheme.luxeSecondary,
          surface: AppTheme.luxeSurface,
          error: AppTheme.luxeError,
        ),
        fontFamily: 'Inter',
        useMaterial3: true,
      ),
      home: const SmartMoveWebLandingScreen(),
    );
  }
}
