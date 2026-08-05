import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import '../../../config/app_config.dart';
import 'driver_dashboard_screen.dart';

class SmartMoveDriverLoginScreen extends StatefulWidget {
  const SmartMoveDriverLoginScreen({super.key});

  @override
  State<SmartMoveDriverLoginScreen> createState() => _SmartMoveDriverLoginScreenState();
}

class _SmartMoveDriverLoginScreenState extends State<SmartMoveDriverLoginScreen> {
  final _emailCtl = TextEditingController(text: 'driver@smartmove.com');
  final _passwordCtl = TextEditingController(text: 'password123');
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;
  bool _isSignUp = false;
  String? _errorMessage;

  @override
  void dispose() {
    _emailCtl.dispose();
    _passwordCtl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _isLoading = true; _errorMessage = null; });

    try {
      final email = _emailCtl.text.trim();
      final password = _passwordCtl.text;
      final url = Uri.parse('${AppConfig.supabaseUrl}/auth/v1/token?grant_type=password');

      final res = await http.post(
        url,
        headers: {
          'Content-Type': 'application/json',
          'apikey': AppConfig.supabaseAnonKey,
        },
        body: jsonEncode({'email': email, 'password': password}),
      ).timeout(const Duration(seconds: 10));

      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        final userId = data['user']['id'] as String?;
        if (userId != null && mounted) {
          _goToDashboard(userId);
          return;
        }
      }

      if (res.statusCode == 400) {
        final data = jsonDecode(res.body);
        final msg = data['error_description'] ?? data['msg'] ?? data['error'] ?? '';
        if (msg.toString().contains('Invalid login credentials')) {
          if (_isSignUp) {
            await _signUp(email, password);
            return;
          }
          throw Exception('Wrong email or password');
        }
        throw Exception(msg.isNotEmpty ? msg : 'Sign in failed');
      }

      throw Exception('Sign in failed (${res.statusCode})');
    } catch (e) {
      if (e is TimeoutException) {
        setState(() => _errorMessage = 'Connection timed out. Check your network.');
      } else {
        setState(() => _errorMessage = _friendlyError(e));
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _signUp(String email, String password) async {
    final url = Uri.parse('${AppConfig.supabaseUrl}/auth/v1/signup');
    final res = await http.post(
      url,
      headers: {
        'Content-Type': 'application/json',
        'apikey': AppConfig.supabaseAnonKey,
      },
      body: jsonEncode({'email': email, 'password': password}),
    ).timeout(const Duration(seconds: 10));

    if (res.statusCode == 200) {
      final data = jsonDecode(res.body);
      final userId = data['id'] as String?;
      if (userId != null && mounted) {
        _goToDashboard(userId);
        return;
      }
    }

    final data = jsonDecode(res.body);
    final msg = data['msg'] ?? data['error_description'] ?? data['error'] ?? '';
    if (msg.toString().contains('already registered')) {
      throw Exception('An account with this email already exists. Try signing in.');
    }
    throw Exception(msg.isNotEmpty ? msg : 'Sign up failed');
  }

  void _goToDashboard(String userId) {
    Navigator.of(context).pushReplacement(
      MaterialPageRoute(builder: (_) => SmartMoveDriverDashboardScreen(userId: userId)),
    );
  }

  String _friendlyError(Object e) {
    final m = e.toString();
    if (m.contains('Wrong email or password')) return 'Wrong email or password';
    if (m.contains('Email not confirmed')) return 'Check your email to confirm your account';
    if (m.contains('already exists')) return 'An account with this email already exists';
    if (m.contains('weak password')) return 'Password must be at least 6 characters';
    if (m.contains('timed out')) return 'Connection timed out. Check your network.';
    return 'Something went wrong. Please try again.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0b1326),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _buildHeader(),
                const SizedBox(height: 32),
                if (_errorMessage != null) _buildErrorBanner(),
                const SizedBox(height: 16),
                _buildAuthForm(),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildErrorBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFF93000a).withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFffb4ab).withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: Color(0xFFffb4ab), size: 20),
          const SizedBox(width: 12),
          Expanded(child: Text(_errorMessage!, style: const TextStyle(color: Color(0xFFffb4ab), fontSize: 13))),
          GestureDetector(
            onTap: () => setState(() => _errorMessage = null),
            child: const Icon(Icons.close, color: Color(0xFFffb4ab), size: 16),
          ),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      children: [
        Container(
          width: 80, height: 80,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: const Color(0xFFadc6ff), width: 2),
            color: const Color(0xFF131b2e),
          ),
          child: const Icon(Icons.person, color: Color(0xFFadc6ff), size: 40),
        ),
        const SizedBox(height: 20),
        const Text('LUXE DRIVER', style: TextStyle(color: Color(0xFFdae2fd), fontSize: 24, fontWeight: FontWeight.w800, letterSpacing: 2)),
        const SizedBox(height: 8),
        const Text('SmartMove', style: TextStyle(color: Color(0xFF5de6ff), fontSize: 14, fontWeight: FontWeight.w600, letterSpacing: 1)),
        const SizedBox(height: 16),
        const Text('Sign in to start driving', style: TextStyle(color: Color(0xFF8c909f), fontSize: 14)),
      ],
    );
  }

  Widget _buildAuthForm() {
    return Form(
      key: _formKey,
      child: Column(
        children: [
          _buildTextField(_emailCtl, 'Email', Icons.email_outlined, false, TextInputType.emailAddress),
          const SizedBox(height: 16),
          _buildTextField(_passwordCtl, 'Password', Icons.lock_outlined, true, TextInputType.visiblePassword),
          const SizedBox(height: 24),
          SizedBox(
            width: double.infinity, height: 56,
            child: ElevatedButton(
              onPressed: _isLoading ? null : _submit,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFadc6ff),
                foregroundColor: const Color(0xFF002e6a),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 0,
              ),
              child: _isLoading
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(color: Color(0xFF002e6a), strokeWidth: 2))
                  : Text(_isSignUp ? 'Create Account' : 'Sign In', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700)),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            children: [
              const Expanded(child: Divider(color: Color(0xFF2a2f3e))),
              const Padding(padding: EdgeInsets.symmetric(horizontal: 16), child: Text('or', style: TextStyle(color: Color(0xFF8c909f), fontSize: 13))),
              const Expanded(child: Divider(color: Color(0xFF2a2f3e))),
            ],
          ),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity, height: 56,
            child: OutlinedButton.icon(
              onPressed: _isLoading ? null : _googleSignIn,
              icon: const Icon(Icons.g_mobiledata, size: 28),
              label: const Text('Sign in with Google', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w600)),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFFdae2fd),
                side: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
          ),
          const SizedBox(height: 16),
          TextButton(
            onPressed: () => setState(() { _isSignUp = !_isSignUp; _errorMessage = null; }),
            child: Text(
              _isSignUp ? 'Already have an account? Sign In' : 'New driver? Create Account',
              style: const TextStyle(color: Color(0xFF5de6ff), fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _googleSignIn() async {}

  Widget _buildTextField(TextEditingController ctl, String hint, IconData icon, bool obscure, TextInputType type) {
    return Container(
      decoration: BoxDecoration(
        color: const Color(0xFF131b2e).withValues(alpha: 0.85),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withValues(alpha: 0.06)),
      ),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: TextFormField(
        controller: ctl,
        obscureText: obscure,
        keyboardType: type,
        enabled: !_isLoading,
        style: const TextStyle(color: Color(0xFFdae2fd), fontSize: 16),
        decoration: InputDecoration(
          prefixIcon: Icon(icon, color: const Color(0xFF8c909f), size: 20),
          hintText: hint,
          hintStyle: const TextStyle(color: Color(0xFF424754), fontSize: 16),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
        ),
        validator: (v) {
          if (v == null || v.trim().isEmpty) return 'Required';
          if (type == TextInputType.emailAddress && !v.contains('@')) return 'Enter a valid email';
          if (obscure && v.length < 6) return 'At least 6 characters';
          return null;
        },
      ),
    );
  }
}
