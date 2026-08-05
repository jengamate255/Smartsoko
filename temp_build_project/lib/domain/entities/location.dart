class SavedLocation {
  final String id;
  final String name;
  final String address;
  final double lat;
  final double lng;
  final String? type;

  SavedLocation({
    required this.id,
    required this.name,
    required this.address,
    required this.lat,
    required this.lng,
    this.type,
  });
}
