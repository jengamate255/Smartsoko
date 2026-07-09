import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/user.dart' as models;
import '../config/app_config.dart';
import '../utils/role_validator.dart';
import '../utils/logger.dart';
import 'supabase_service.dart';
import '../utils/rate_limiter.dart';
import 'dart:math';

class AuthService {
  final firebase_auth.FirebaseAuth _auth = firebase_auth.FirebaseAuth.instance;
  final FirebaseFirestore _firestore = FirebaseFirestore.instance;
  final SupabaseService _supabaseService = SupabaseService();
  
  models.User? user;

  firebase_auth.User? get currentUser => _auth.currentUser;

  Stream<models.User?> get authStateChanges => _auth.authStateChanges().asyncMap((firebaseUser) async {
    if (firebaseUser == null) return null;
    return getUser(firebaseUser.uid);
  });

  Future<models.User?> getUser(String uid) async {
    try {
      final doc = await _firestore.collection(AppConfig.usersCollection).doc(uid).get();
      if (doc.exists) return models.User.fromFirestore(doc);
    } catch (e) {
      AppLogger.warning('Firebase getUser failed, trying Supabase: $e');
    }

    try {
      final supabaseData = await _supabaseService.client
          .from('profiles')
          .select()
          .eq('id', uid)
          .maybeSingle();
      
      if (supabaseData != null) {
        return models.User.fromMap(supabaseData);
      }
    } catch (e) {
      AppLogger.error('Supabase getUser fallback failed', e);
    }
    return null;
  }

Future<models.User> signInWithPhone(String phone) async {
      final normalizedPhone = normalizePhone(phone);
     
     // Check rate limit
     final isLockedOut = await RateLimiter.isLockedOut(normalizedPhone);
     if (isLockedOut) {
       final remainingAttempts = await RateLimiter.getRemainingAttempts(normalizedPhone);
       if (remainingAttempts == 0) {
         throw Exception('Too many attempts. Please try again later.');
       }
     }
     
     // Log authentication attempt
     AppLogger.info('Authentication attempt for phone: $normalizedPhone');
     
     try {
       final doc = await _firestore.collection(AppConfig.usersCollection)
           .where('phone', isEqualTo: normalizedPhone)
           .limit(1)
           .get();
       
       if (doc.docs.isNotEmpty) {
         user = models.User.fromFirestore(doc.docs.first);
         if (user != null) {
           AppLogger.info('Existing user found in Firebase with role: ${user!.role.name}');
         }
       } else {
         // Try Supabase before creating new
         final supabaseData = await _supabaseService.client
             .from('profiles')
             .select()
             .eq('phone', normalizedPhone)
             .maybeSingle();
         
         if (supabaseData != null) {
           user = models.User.fromMap(supabaseData);
           if (user != null) {
             AppLogger.info('Existing user found in Supabase with role: ${user!.role.name}');
           }
         } else {
           final newUser = models.User(
             id: '',
             phone: normalizedPhone,
             role: models.UserRole.customer,
             createdAt: DateTime.now(),
           );
           
           final ref = await _firestore.collection(AppConfig.usersCollection).add(newUser.toFirestore());
           
           user = models.User(
             id: ref.id,
             phone: normalizedPhone,
             role: models.UserRole.customer,
             createdAt: DateTime.now(),
           );
           
           // Also create in Supabase for sync
           try {
             await _supabaseService.client.from('profiles').insert({
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
       final supabaseData = await _supabaseService.client
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
       final errorMessage = RoleValidator.getRoleErrorMessage(user!.role, appType);
       AppLogger.warning('Role validation failed: ${user!.role.name} not allowed in $appType app');
       
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
    await _firestore.collection(AppConfig.usersCollection).doc(uid).update({
      'role': role.name,
    });
  }

  Future<void> updateUserProfile(String uid, {String? name, String? email, String? address, double? lat, double? lng}) async {
    final updates = <String, dynamic>{};
    if (name != null) updates['name'] = name;
    if (email != null) updates['email'] = email;
    if (address != null) updates['address'] = address;
    if (lat != null) updates['lat'] = lat;
    if (lng != null) updates['lng'] = lng;
    
    if (updates.isNotEmpty) {
      await _firestore.collection(AppConfig.usersCollection).doc(uid).update(updates);
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
      final doc = await _firestore.collection(AppConfig.usersCollection)
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

  Future<models.User> createUserWithRole(String phone, models.UserRole role) async {
    final normalizedPhone = normalizePhone(phone);
    
    final newUser = models.User(
      id: '',
      phone: normalizedPhone,
      role: role,
      createdAt: DateTime.now(),
    );

    final docRef = await _firestore.collection(AppConfig.usersCollection).add(newUser.toFirestore());

    final createdUser = models.User(
      id: docRef.id,
      phone: normalizedPhone,
      role: role,
      createdAt: DateTime.now(),
    );

    // Also create in Supabase for sync
    try {
      await _supabaseService.client.from('profiles').insert({
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
