class ServiceType {
  final String id;
  final String name;
  final double basePrice;
  final double pricePerKm;
  final double pricePerMin;
  final String? iconUrl;
  final String? description;
  final int estimatedMinutes;
  final int minEstimateMinutes;
  final int maxEstimateMinutes;
  final int capacity;

  const ServiceType({
    required this.id,
    required this.name,
    required this.basePrice,
    required this.pricePerKm,
    this.pricePerMin = 0.0,
    this.iconUrl,
    this.description,
    this.estimatedMinutes = 0,
    this.minEstimateMinutes = 0,
    this.maxEstimateMinutes = 0,
    this.capacity = 4,
  });

  double estimatePrice(double distance, double duration) {
    return basePrice + (pricePerKm * distance) + (pricePerMin * duration);
  }
}
