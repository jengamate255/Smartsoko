class Driver {
  final String id;
  final String name;
  final String phone;
  final String? avatarUrl;
  final double rating;
  final int totalTrips;
  final String vehicleModel;
  final String vehicleColor;
  final String vehiclePlate;
  final String vehicleYear;
  final bool isAvailable;

  const Driver({
    required this.id,
    required this.name,
    required this.phone,
    this.avatarUrl,
    required this.rating,
    required this.totalTrips,
    required this.vehicleModel,
    required this.vehicleColor,
    required this.vehiclePlate,
    required this.vehicleYear,
    this.isAvailable = true,
  });
}
