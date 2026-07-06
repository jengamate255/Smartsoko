import 'package:flutter/material.dart';
import '../config/app_config.dart';
import 'customer/login_screen.dart' as customer;
import 'driver/driver_login_screen.dart' as driver;
import 'merchant/merchant_login_screen.dart' as merchant;

class AppLoginScreen extends StatelessWidget {
  const AppLoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    switch (AppConfig.appType) {
      case 'customer':
        return const customer.LoginScreen();
      case 'driver':
        return const driver.DriverLoginScreen();
      case 'merchant':
        return const merchant.MerchantLoginScreen();
      default:
        return const customer.LoginScreen();
    }
  }
}
