import 'package:cloud_firestore/cloud_firestore.dart';

enum UserRole { customer, rider, admin, merchant }

class User {
  final String id;
  final String phone;
  final String? name;
  final String? email;
  final UserRole role;
  final String? address;
  final double? lat;
  final double? lng;
  final DateTime createdAt;

  User({
    required this.id,
    required this.phone,
    this.name,
    this.email,
    required this.role,
    this.address,
    this.lat,
    this.lng,
    required this.createdAt,
  });

  factory User.fromFirestore(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return User(
      id: doc.id,
      phone: data['phone'] ?? '',
      name: data['name'],
      email: data['email'],
      role: UserRole.values.firstWhere(
        (e) => e.name == data['role'],
        orElse: () => UserRole.customer,
      ),
      address: data['address'],
      lat: data['lat']?.toDouble(),
      lng: data['lng']?.toDouble(),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  factory User.fromMap(Map<String, dynamic> data) {
    return User(
      id: data['id']?.toString() ?? '',
      phone: data['phone'] ?? '',
      name: data['name'],
      email: data['email'],
      role: UserRole.values.firstWhere(
        (e) => e.name == data['role'],
        orElse: () => UserRole.customer,
      ),
      address: data['address'],
      lat: (data['latitude'] ?? data['lat'])?.toDouble(),
      lng: (data['longitude'] ?? data['lng'])?.toDouble(),
      createdAt: data['created_at'] != null 
          ? DateTime.parse(data['created_at']) 
          : DateTime.now(),
    );
  }

  Map<String, dynamic> toFirestore() {
    return {
      'phone': phone,
      'name': name,
      'email': email,
      'role': role.name,
      'address': address,
      'lat': lat,
      'lng': lng,
      'createdAt': Timestamp.fromDate(createdAt),
    };
  }
}
