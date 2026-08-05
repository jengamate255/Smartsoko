class User {
  final String id;
  final String email;
  final String phone;
  final String fullName;
  final String? avatarUrl;
  final DateTime? createdAt;

  User({
    required this.id,
    required this.email,
    required this.phone,
    required this.fullName,
    this.avatarUrl,
    this.createdAt,
  });

  String get name => fullName;

  User copyWith({
    String? id,
    String? email,
    String? phone,
    String? fullName,
    String? avatarUrl,
    DateTime? createdAt,
  }) {
    return User(
      id: id ?? this.id,
      email: email ?? this.email,
      phone: phone ?? this.phone,
      fullName: fullName ?? this.fullName,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      createdAt: createdAt ?? this.createdAt,
    );
  }
}
