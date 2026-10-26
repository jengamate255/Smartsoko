import 'dart:convert';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:http/http.dart' as http;
import 'package:smartsoko/models/user.dart' as models;
import 'package:smartsoko/config/app_config.dart';
import 'package:smartsoko/utils/role_validator.dart';
import 'package:smartsoko/utils/logger.dart';
import 'supabase_service.dart';
import 'package:smartsoko/utils/rate_limiter.dart';

class AuthService {
  final firebase_auth.FirebaseAuth _auth = firebase_auth.FirebaseAuth.instance;
  final FirebaseFirestore firestore = FirebaseFirestore.instance;
  final SupabaseService supabaseService = SupabaseService();

  models.User? user;

  firebase_auth.User? get currentUser => _auth.currentUser;

  /// A Firebase ID token for API calls that must run as the signed-in user
  /// (merchant/driver order writes, PesaPal checkout). Null when there is no
  /// session, which is the normal case for the demo flow.
  Future<String?> getIdToken() async {
    final firebaseUser = _auth.currentUser;
    if (firebaseUser == null) return null;
    try {
      return await firebaseUser.getIdToken();
    } catch (e) {
      AppLogger.warning('Could not read Firebase ID token: $e');
      return null;
    }
  }

  /// Like [getIdToken], but throws instead of returning null.
  ///
  /// Used by the order writes, which the server authenticates: without a token
  /// it would answer 401 and the caller would show a much less useful error.
  Future<String> requireIdToken() async {
    final token = await getIdToken();
    if (token == null) {
      throw Exception('You are signed out. Sign in again to change orders.');
    }
    return token;
  }

  Stream<models.User?> get authStateChanges =>
      _auth.authStateChanges().asyncMap((firebaseUser) async {
        if (firebaseUser == null) return null;
        return getUser(firebaseUser.uid);
      });

  Future<models.User?> getUser(String uid) async {
    // Demo / signed-out sessions have no uid; skip lookups that would
    // otherwise fail with an empty document path or an invalid uuid.
    if (uid.isEmpty) return null;

    // Profiles are read through the API server: the `profiles` RLS policies
    // only expose a row to its own Supabase auth user, so an anon-key read
    // comes back empty. The server holds the service key and resolves the row
    // by `firebase_uid` (then email).
    final fromApi = await _fetchProfileFromApi();
    if (fromApi != null) return fromApi;

    // Fallback for accounts that signed in against Supabase Auth directly,
    // where RLS allows `auth.uid() = id`. Keyed on `firebase_uid`: a Firebase
    // uid is not a uuid, so filtering `id` by one made PostgREST reject the
    // request with 22P02.
    try {
      final supabaseData = await supabaseService.client
          .from('profiles')
          .select()
          .eq('firebase_uid', uid)
          .maybeSingle();

      if (supabaseData != null) {
        return models.User.fromMap(supabaseData);
      }
    } catch (e) {
      AppLogger.warning('Supabase getUser fallback failed: $e');
    }
    return null;
  }

  /// `GET /api/users/profile` using the current Firebase ID token.
  ///
  /// Returns null when there is no session, no matching profile, or the server
  /// is unreachable â€” the caller then falls back to Supabase.
  Future<models.User?> _fetchProfileFromApi() async {
    final firebaseUser = _auth.currentUser;
    if (firebaseUser == null) return null;

    try {
      final idToken = await firebaseUser.getIdToken();
      final response = await http.get(
        Uri.parse('${AppConfig.apiBaseUrl}/users/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $idToken',
        },
      );

      if (response.statusCode != 200) {
        AppLogger.warning(
          'GET /users/profile failed (${response.statusCode}): ${response.body}',
        );
        return null;
      }

      final body = jsonDecode(response.body);
      final data = body is Map ? body['data'] : null;
      if (data is! Map) return null;

      return models.User.fromApiProfile(
        data.cast<String, dynamic>(),
        fallbackId: firebaseUser.uid,
      );
    } catch (e) {
      AppLogger.warning('API profile lookup failed: $e');
      return null;
    }
  }

  Future<models.User> signInWithPhone(String phone) async {
    final normalizedPhone = normalizePhone(phone);

    // Check rate limit
    final isLockedOut = await RateLimiter.isLockedOut(normalizedPhone);
    if (isLockedOut) {
      final remainingAttempts = await RateLimiter.getRemainingAttempts(
        normalizedPhone,
      );
      if (remainingAttempts == 0) {
        throw Exception('Too many attempts. Please try again later.');
      }
    }

    // Log authentication attempt
    AppLogger.info('Authentication attempt for phone: $normalizedPhone');

    try {
      final doc = await firestore
          .collection(AppConfig.usersCollection)
          .where('phone', isEqualTo: normalizedPhone)
          .limit(1)
          .get();

      if (doc.docs.isNotEmpty) {
        user = models.User.fromFirestore(doc.docs.first);
        if (user != null) {
          AppLogger.info(
            'Existing user found in Firebase with role: ${user!.role.name}',
          );
        }
      } else {
        // Try Supabase before creating new
        final supabaseData = await supabaseService.client
            .from('profiles')
            .select()
            .eq('phone', normalizedPhone)
            .maybeSingle();

        if (supabaseData != null) {
          user = models.User.fromMap(supabaseData);
          if (user != null) {
            AppLogger.info(
              'Existing user found in Supabase with role: ${user!.role.name}',
            );
          }
        } else {
          final newUser = models.User(
            id: '',
            phone: normalizedPhone,
            role: models.UserRole.customer,
            createdAt: DateTime.now(),
          );

          final ref = await firestore
              .collection(AppConfig.usersCollection)
              .add(newUser.toFirestore());

          user = models.User(
            id: ref.id,
            phone: normalizedPhone,
            role: models.UserRole.customer,
            createdAt: DateTime.now(),
          );

          // Also create in Supabase for sync
          try {
            await supabaseService.client.from('profiles').insert({
              'id': user!.id,
              'phone': normalizedPhone,
              'role': 'customer',
            });
          } catch (e) {
            AppLogger.warning('Failed to sync new user to Supabase: $e');
          }

          AppLogger.info('New user created with role: ${user!.role.name}');
        }
      }
    } catch (e) {
      AppLogger.warning('Firebase signInWithPhone failed, trying Supabase: $e');
      final supabaseData = await supabaseService.client
          .from('profiles')
          .select()
          .eq('phone', normalizedPhone)
          .maybeSingle();

      if (supabaseData != null && supabaseData.isNotEmpty) {
        user = models.User.fromMap(supabaseData);
      } else {
        throw Exception('Authentication failed on all backends');
      }
    }

    if (user == null) {
      throw Exception('Failed to create or retrieve user');
    }

    // Validate role against app type
    final appType = AppConfig.appType;
    if (!RoleValidator.isRoleAllowedForApp(user!.role, appType)) {
      final errorMessage = RoleValidator.getRoleErrorMessage(
        user!.role,
        appType,
      );
      AppLogger.warning(
        'Role validation failed: ${user!.role.name} not allowed in $appType app',
      );

      throw RoleException(
        message: errorMessage,
        userRole: user!.role,
        appType: appType,
      );
    }

    // Record successful attempt
    await RateLimiter.recordAttempt(normalizedPhone, true);

    AppLogger.info('Authentication successful for user: ${user!.id}');
    return user!;
  }

  Future<void> updateUserRole(String uid, models.UserRole role) async {
    await firestore.collection(AppConfig.usersCollection).doc(uid).update({
      'role': role.name,
    });
  }

  Future<void> updateUserProfile(
    String uid, {
    String? name,
    String? email,
    String? address,
    double? lat,
    double? lng,
  }) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['name'] = name;
    if (email != null) updates['email'] = email;
    if (address != null) updates['address'] = address;
    if (lat != null) updates['lat'] = lat;
    if (lng != null) updates['lng'] = lng;

    if (updates.isNotEmpty) {
      await firestore
          .collection(AppConfig.usersCollection)
          .doc(uid)
          .update(updates);
    }
  }

  String normalizePhone(String phone) {
    String normalized = phone.replaceAll(RegExp(r'[^\d]'), '');
    if (normalized.startsWith('0')) {
      normalized = '255${normalized.substring(1)}';
    } else if (!normalized.startsWith('255')) {
      normalized = '255$normalized';
    }
    return normalized;
  }

  Future<models.User?> getUserByPhone(String phone) async {
    final normalizedPhone = normalizePhone(phone);
    try {
      final doc = await firestore
          .collection(AppConfig.usersCollection)
          .where('phone', isEqualTo: normalizedPhone)
          .limit(1)
          .get();

      if (doc.docs.isNotEmpty) {
        return models.User.fromFirestore(doc.docs.first);
      }
    } catch (e) {
      AppLogger.warning('getUserByPhone failed: $e');
    }
    return null;
  }

  Future<models.User> createUserWithRole(
    String phone,
    models.UserRole role,
  ) async {
    final normalizedPhone = normalizePhone(phone);

    final newUser = models.User(
      id: '',
      phone: normalizedPhone,
      role: role,
      createdAt: DateTime.now(),
    );

    final docRef = await firestore
        .collection(AppConfig.usersCollection)
        .add(newUser.toFirestore());

    final createdUser = models.User(
      id: docRef.id,
      phone: normalizedPhone,
      role: role,
      createdAt: DateTime.now(),
    );

    // Also create in Supabase for sync
    try {
      await supabaseService.client.from('profiles').insert({
        'id': createdUser.id,
        'phone': normalizedPhone,
        'role': role.name,
      });
    } catch (e) {
      AppLogger.warning('Failed to sync new user to Supabase: $e');
    }

    return createdUser;
  }

  Future<void> signOut() async {
    await _auth.signOut();
  }
}
