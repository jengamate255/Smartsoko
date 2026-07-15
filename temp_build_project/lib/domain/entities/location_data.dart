class LocationData {
  final String id;
  final String address;
  final double latitude;
  final double longitude;
  final String? placeId;
  final String? label;

  const LocationData({
    required this.id,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.placeId,
    this.label,
  });

  LocationData copyWith({
    String? id,
    String? address,
    double? latitude,
    double? longitude,
    String? placeId,
    String? label,
  }) {
    return LocationData(
      id: id ?? this.id,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      placeId: placeId ?? this.placeId,
      label: label ?? this.label,
    );
  }
}
