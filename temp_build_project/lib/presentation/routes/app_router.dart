import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:temp_build_project/presentation/pages/splash_page.dart';
import 'package:temp_build_project/presentation/pages/login_page.dart';
import 'package:temp_build_project/presentation/pages/register_page.dart';
import 'package:temp_build_project/presentation/pages/home_page.dart';
import 'package:temp_build_project/presentation/pages/booking_page.dart';
import 'package:temp_build_project/presentation/pages/trip_tracking_page.dart';
import 'package:temp_build_project/presentation/pages/trip_history_page.dart';
import 'package:temp_build_project/presentation/pages/profile_page.dart';
import 'package:temp_build_project/presentation/pages/wallet_page.dart';
import 'package:temp_build_project/presentation/pages/payment_methods_page.dart';
import 'package:temp_build_project/presentation/pages/saved_locations_page.dart';
import 'package:temp_build_project/presentation/pages/notifications_page.dart';
import 'package:temp_build_project/presentation/pages/settings_page.dart';

final GlobalKey<NavigatorState> _rootNavigatorKey = GlobalKey<NavigatorState>();
final GlobalKey<NavigatorState> _shellNavigatorKey = GlobalKey<NavigatorState>();

final appRouter = GoRouter(
  navigatorKey: _rootNavigatorKey,
  initialLocation: '/splash',
  routes: [
    GoRoute(
      path: '/splash',
      builder: (context, state) => const SplashPage(),
    ),
    GoRoute(
      path: '/auth/login',
      builder: (context, state) => const LoginPage(),
    ),
    GoRoute(
      path: '/auth/register',
      builder: (context, state) => const RegisterPage(),
    ),
    ShellRoute(
      navigatorKey: _shellNavigatorKey,
      builder: (context, state, child) => _ShellScaffold(child: child),
      routes: [
        GoRoute(
          path: '/home',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: HomePage(),
          ),
        ),
        GoRoute(
          path: '/ride/history',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: TripHistoryPage(),
          ),
        ),
        GoRoute(
          path: '/wallet',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: WalletPage(),
          ),
        ),
        GoRoute(
          path: '/profile',
          pageBuilder: (context, state) => const NoTransitionPage(
            child: ProfilePage(),
          ),
        ),
      ],
    ),
    GoRoute(
      path: '/ride/booking',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const BookingPage(),
    ),
    GoRoute(
      path: '/ride/tracking/:id',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) {
        final tripId = state.pathParameters['id']!;
        return TripTrackingPage(tripId: tripId);
      },
    ),
    GoRoute(
      path: '/payment-methods',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const PaymentMethodsPage(),
    ),
    GoRoute(
      path: '/locations',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const SavedLocationsPage(),
    ),
    GoRoute(
      path: '/notifications',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const NotificationsPage(),
    ),
    GoRoute(
      path: '/settings',
      parentNavigatorKey: _rootNavigatorKey,
      builder: (context, state) => const SettingsPage(),
    ),
  ],
);

class _ShellScaffold extends StatelessWidget {
  final Widget child;

  const _ShellScaffold({required this.child});

  int _currentIndex(BuildContext context) {
    final location = GoRouterState.of(context).uri.toString();
    if (location.startsWith('/ride/history')) return 1;
    if (location.startsWith('/wallet')) return 2;
    if (location.startsWith('/profile')) return 3;
    return 0;
  }

  @override
  Widget build(BuildContext context) {
    final index = _currentIndex(context);
    return Scaffold(
      body: child,
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: index,
        onTap: (value) {
          switch (value) {
            case 0:
              context.go('/home');
              break;
            case 1:
              context.go('/ride/history');
              break;
            case 2:
              context.go('/wallet');
              break;
            case 3:
              context.go('/profile');
              break;
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.home_outlined),
            activeIcon: Icon(Icons.home),
            label: 'Home',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.history_outlined),
            activeIcon: Icon(Icons.history),
            label: 'Trips',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.account_balance_wallet_outlined),
            activeIcon: Icon(Icons.account_balance_wallet),
            label: 'Wallet',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}
