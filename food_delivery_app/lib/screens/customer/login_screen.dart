import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../services/analytics_service.dart';
import '../../config/app_config.dart';
import '../../utils/validators.dart';
import '../auth/role_selection_screen.dart';
import 'main_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _phoneController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    final analytics = context.read<AnalyticsService>();
    analytics.logScreenView(
      screenName: 'Login',
      screenClass: 'LoginScreen',
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
       final normalizedPhone = authService.normalizePhone(_phoneController.text);
        
       // Check if user exists first
       final existingUserDoc = await authService.firestore
           .collection(AppConfig.usersCollection)
           .where('phone', isEqualTo: normalizedPhone)
           .limit(1)
           .get();

       if (existingUserDoc.docs.isNotEmpty) {
         // Existing user - sign in directly
         await authService.signInWithPhone(_phoneController.text);
       } else {
         // New user - navigate to role selection
         if (mounted) {
           Navigator.of(context).push(
             MaterialPageRoute(
               builder: (context) => RoleSelectionScreen(
                 phoneNumber: _phoneController.text,
               ),
             ),
           );
         }
       }
     } catch (e) {
       if (mounted) {
         ScaffoldMessenger.of(context).showSnackBar(
           SnackBar(content: Text('Error: $e')),
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
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Icon(
                  Icons.fastfood,
                  size: 80,
                  color: Color(0xFF064E3B),
                ),
                const SizedBox(height: 24),
                const Text(
                  'SmartSoko',
                  style: TextStyle(
                    fontSize: 28,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  'Enter your phone number to continue',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: Colors.grey[600],
                  ),
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
                    validator: (value) => Validators.validatePhone(value),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _isLoading ? null : _signIn,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF064E3B),
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
                      : const Text('Continue'),
                ),
                const SizedBox(height: 16),
                TextButton(
                  onPressed: () {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (_) => const MainScreen()),
                    );
                  },
                  child: Text(
                    'Skip (Demo)',
                    style: TextStyle(color: Colors.grey[500], fontSize: 14),
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
