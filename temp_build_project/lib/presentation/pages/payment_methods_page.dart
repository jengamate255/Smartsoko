import 'package:flutter/material.dart';

class PaymentMethodsPage extends StatefulWidget {
  const PaymentMethodsPage({super.key});

  @override
  State<PaymentMethodsPage> createState() => _PaymentMethodsPageState();
}

class _PaymentMethodsPageState extends State<PaymentMethodsPage> {
  String _selectedMethod = 'wallet';

  final List<_PaymentMethod> _methods = const [
    _PaymentMethod(
      id: 'wallet',
      name: 'Wallet',
      icon: Icons.account_balance_wallet_outlined,
      subtitle: '\$125.50 available',
    ),
    _PaymentMethod(
      id: 'credit_card',
      name: 'Credit Card',
      icon: Icons.credit_card,
      subtitle: 'Visa ending in 4242',
    ),
    _PaymentMethod(
      id: 'debit_card',
      name: 'Debit Card',
      icon: Icons.credit_card_outlined,
      subtitle: 'Mastercard ending in 1234',
    ),
    _PaymentMethod(
      id: 'paypal',
      name: 'PayPal',
      icon: Icons.payments_outlined,
      subtitle: 'user@email.com',
    ),
    _PaymentMethod(
      id: 'cash',
      name: 'Cash',
      icon: Icons.money,
      subtitle: 'Pay with cash',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Payment Methods'),
        centerTitle: true,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(vertical: 8),
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text(
              'Choose your preferred payment method',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: Colors.grey.shade600,
              ),
            ),
          ),
          ..._methods.map(
            (method) => Card(
              margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              child: RadioListTile<String>(
                value: method.id,
                groupValue: _selectedMethod,
                onChanged: (value) => setState(() => _selectedMethod = value!),
                title: Text(method.name),
                subtitle: Text(method.subtitle),
                secondary: Icon(method.icon, color: Colors.grey.shade600),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: OutlinedButton.icon(
              onPressed: () {},
              icon: const Icon(Icons.add),
              label: const Text('Add Payment Method'),
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethod {
  final String id;
  final String name;
  final IconData icon;
  final String subtitle;

  const _PaymentMethod({
    required this.id,
    required this.name,
    required this.icon,
    required this.subtitle,
  });
}
