import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:smartsoko/services/auth_service.dart';
import 'package:smartsoko/services/shop_service.dart';
import 'package:smartsoko/services/analytics_service.dart';
import 'package:smartsoko/models/shop.dart';
import 'package:smartsoko/screens/sme_onboarding_screen.dart';
import 'merchant_main_screen.dart';

class MerchantLoginScreen extends StatefulWidget {
  const MerchantLoginScreen({super.key});

  @override
  State<MerchantLoginScreen> createState() => _MerchantLoginScreenState();
}

class _MerchantLoginScreenState extends State<MerchantLoginScreen> {
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final analytics = context.read<AnalyticsService>();
    analytics.logScreenView(
      screenName: 'MerchantLogin',
      screenClass: 'MerchantLoginScreen',
    );
  }

  @override
  void dispose() {
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final authService = context.read<AuthService>();
      final user = await authService.signInWithPhone(_phoneController.text);

      if (!mounted) return;

      final shopService = ShopService();
      final shop = await shopService.getShopByOwnerId(user.id);

      if (shop != null) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (context) => const MerchantMainScreen()),
        );
      } else {
        final result = await Navigator.of(context).push(
          MaterialPageRoute(builder: (context) => const SMEOnboardingScreen()),
        );

        if (result == true && mounted) {
          final newShop = await shopService.getShopByOwnerId(user.id);
          if (newShop != null && mounted) {
            Navigator.of(context).pushReplacement(
              MaterialPageRoute(
                builder: (context) => const MerchantMainScreen(),
              ),
            );
          }
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hitilafu: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(Icons.store, size: 80, color: Colors.orange),
                const SizedBox(height: 24),
                const Text(
                  'SmartSoko - Merchant',
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Ingia ili usimamie biashara yako',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 48),
                TextFormField(
                  controller: _phoneController,
                  keyboardType: TextInputType.phone,
                  decoration: const InputDecoration(
                    labelText: 'Phone Number',
                    hintText: '07XXXXXXXX',
                    prefixIcon: Icon(Icons.phone),
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    final phone = value?.trim() ?? '';
                    if (phone.isEmpty) {
                      return 'Tafadhali jaza namba ya simu';
                    }
                    final cleaned = phone.replaceAll(RegExp(r'[\s\-\(\)]'), '');
                    final tanzanianPhone = RegExp(
                      r'^(0[567]\d{8}|\+255[567]\d{8})$',
                    );
                    if (!tanzanianPhone.hasMatch(cleaned)) {
                      return 'Tafadhali weka namba ya simu sahihi';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _isLoading ? null : _signIn,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.orange,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 16),
                  ),
                  child: _isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Ingia (Login)'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () async {
                    final result = await Navigator.of(context).push(
                      MaterialPageRoute(
                        builder: (context) => const SMEOnboardingScreen(),
                      ),
                    );
                    if (result == true && mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text(
                            'Biashara imesajiliwa! Sasa unaweza kuingia.',
                          ),
                          backgroundColor: Colors.green,
                        ),
                      );
                    }
                  },
                  child: const Text(
                    'Huna akaunti? Sajili biashara yako',
                    style: TextStyle(color: Colors.orange),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
