import 'package:flutter/material.dart';
import '../config/app_config.dart';
import 'customer/main_screen.dart' as customer;
import 'driver/driver_main_screen.dart' as driver;
import 'merchant/merchant_main_screen.dart' as merchant;

class AppMainScreen extends StatelessWidget {
  const AppMainScreen({super.key});

  @override
  Widget build(BuildContext context) {
    switch (AppConfig.appType) {
      case 'customer':
        return const customer.MainScreen();
      case 'driver':
        return const driver.DriverMainScreen();
      case 'merchant':
        return const merchant.MerchantMainScreen();
      default:
        return const customer.MainScreen();
    }
  }
}
