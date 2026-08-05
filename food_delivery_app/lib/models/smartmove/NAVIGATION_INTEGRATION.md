# SmartMove Navigation Integration Guide

This guide explains how to integrate SmartMove screens into the existing SmartSoko Flutter app.

## Step 1: Add SmartMove Tab to Customer Bottom Navigation

Edit `lib/screens/customer/main_screen.dart` to add a SmartMove tab:

```dart
// Add import
import '../smartmove/customer/ride_booking_screen.dart';

// In the _screens list, add:
// RideBookingScreen as a new tab
final List<Widget> _screens = [
  DiscoveryScreen(),
  HomeScreen(),
  OrdersScreen(),
  RideBookingScreen(), // NEW
  ProfileScreen(),
];

// Update NavigationBar destinations to include 5 items
NavigationBar(
  destinations: const [
    NavigationDestination(icon: Icon(Icons.explore), label: 'Discover'),
    NavigationDestination(icon: Icon(Icons.home), label: 'Home'),
    NavigationDestination(icon: Icon(Icons.receipt), label: 'Orders'),
    NavigationDestination(icon: Icon(Icons.directions_car), label: 'Ride'), // NEW
    NavigationDestination(icon: Icon(Icons.person), label: 'Profile'),
  ],
  selectedIndex: _currentIndex,
  onDestinationSelected: (index) => setState(() => _currentIndex = index),
)
```

## Step 2: Add SmartMove Tab to Customer Profile (Alternative)

For a simpler integration, add a SmartMove button to the existing HomeScreen:

```dart
// In lib/screens/customer/home_screen.dart
// Add a banner/button that navigates to RideBookingScreen

ElevatedButton.icon(
  onPressed: () => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => const RideBookingScreen()),
  ),
  icon: const Icon(Icons.directions_car),
  label: const Text('Book a Ride'),
)
```

## Step 3: Driver App Navigation

The driver app uses `lib/main_driver.dart` with `DriverMainScreen`. To integrate:

**Option A**: Add SmartMove for drivers in the existing driver app:

```dart
// In lib/screens/driver/driver_main_screen.dart
// Replace or augment the existing content

import '../smartmove/driver/driver_dashboard_screen.dart';

// In build method:
return DriverDashboardScreen(userId: currentUserId);
```

**Option B**: Create a separate SmartMove driver entry point:

```dart
// lib/main_smartmove_driver.dart
import 'package:flutter/material.dart';
import 'config/app_config.dart';
import 'screens/smartmove/driver/driver_dashboard_screen.dart';

void main() {
  AppConfig.setAppType('driver');
  runApp(const SmartMoveDriverApp());
}

class SmartMoveDriverApp extends StatelessWidget {
  const SmartMoveDriverApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SmartMove Driver',
      theme: ThemeData(primaryColor: const Color(0xFF064e3b)),
      home: DriverDashboardScreen(userId: 'driver-id'),
    );
  }
}
```

## Step 4: Merchant Integration

Add "Request Driver" button to merchant order screens:

```dart
// In lib/screens/merchant/merchant_order_detail_screen.dart
import '../smartmove/merchant_driver_request_screen.dart';

// Add button:
ElevatedButton.icon(
  onPressed: () => Navigator.push(
    context,
    MaterialPageRoute(
      builder: (_) => MerchantDriverRequestScreen(
        orderId: order.id,
        customerId: order.customerId,
        customerAddress: order.deliveryAddress,
        customerLatitude: order.deliveryLat,
        customerLongitude: order.deliveryLng,
        merchantId: currentUserId,
        merchantName: 'My Store',
      ),
    ),
  ),
  icon: const Icon(Icons.delivery_dining),
  label: const Text('Request Driver'),
)
```

## Step 5: Admin Integration

Add SmartMove to the admin sidebar:

```dart
// In lib/screens/admin/admin_dashboard_screen.dart
import '../smartmove/admin/smartmove_admin_dashboard.dart';

// Add navigation item:
ListTile(
  leading: const Icon(Icons.directions_car),
  title: const Text('SmartMove'),
  onTap: () => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => const SmartMoveAdminDashboard()),
  ),
)
```

## Step 6: Bottom Navigation Reordering (Unified App)

For the unified `main.dart` app, add SmartMove to the role-specific navigation:

```dart
// In lib/screens/app_main_screen.dart
// For customer role, return a modified MainScreen that includes SmartMove tab
```

## Step 7: Deep Linking (Optional)

Add deep linking support for SmartMove screens:

```dart
// In main.dart or routes.dart
// Example deep link patterns:
// smartsoko://ride/book - Opens RideBookingScreen
// smartsoko://ride/track/{id} - Opens RideTrackingScreen
// smartsoko://ride/history - Opens RideHistoryScreen
```

## Step 8: Push Notifications

Integrate ride-related push notifications:
- When a driver is assigned: navigate to `RideTrackingScreen`
- When a ride request comes in (driver): show notification with accept/reject
- When ride status changes: update the screen state

## Navigation Map

```
Customer App:
└── MainScreen (bottom nav)
    ├── Home Tab
    ├── Search Tab
    ├── Orders Tab
    ├── SMARTSMOVE TAB (new)
    │   └── RideBookingScreen
    │       └── RideTrackingScreen (push)
    │           └── RideReceiptScreen (push)
    ├── Profile Tab → RideHistoryScreen (push)
    └── Any → RideBookingScreen (deep link / quick action)

Driver App:
└── DriverDashboardScreen
    ├── DriverEarningsScreen (push)
    ├── DriverRideHistoryScreen (push)
    └── RideTrackingScreen (when accepting a ride)

Merchant App:
└── MerchantMainScreen
    └── MerchantDriverRequestScreen (push from order detail)

Admin:
└── AdminDashboardScreen (sidebar)
    └── SmartMoveAdminDashboard (push)
```

## Dependencies to Add

```yaml
# pubspec.yaml
dependencies:
  flutter_map: ^7.0.2
  latlong2: ^0.9.1
  url_launcher: ^6.3.1
  flutter_polyline_points: ^2.1.0
  uuid: ^4.5.1
  intl: ^0.19.0
```
