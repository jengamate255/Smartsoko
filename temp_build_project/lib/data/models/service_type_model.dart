import '../../domain/entities/service_type.dart';

class ServiceTypeModel extends ServiceType {
  ServiceTypeModel({
    required super.id,
    required super.name,
    required super.basePrice,
    required super.pricePerKm,
    super.pricePerMin,
    super.iconUrl,
    super.description,
    super.estimatedMinutes,
    super.minEstimateMinutes,
    super.maxEstimateMinutes,
    super.capacity,
  });

  factory ServiceTypeModel.fromJson(Map<String, dynamic> json) {
    return ServiceTypeModel(
      id: json['id'] as String,
      name: json['name'] as String,
      basePrice: (json['base_fare'] as num).toDouble(),
      pricePerKm: (json['per_km_rate'] as num).toDouble(),
      pricePerMin: (json['per_min_rate'] as num?)?.toDouble() ?? 0.0,
      iconUrl: json['icon_url'] as String?,
      description: json['description'] as String?,
      estimatedMinutes: json['estimated_minutes'] as int? ?? 5,
      minEstimateMinutes: json['min_estimate_minutes'] as int? ?? 0,
      maxEstimateMinutes: json['max_estimate_minutes'] as int? ?? 0,
      capacity: json['capacity'] as int? ?? 4,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'base_fare': basePrice,
      'per_km_rate': pricePerKm,
      'per_min_rate': pricePerMin,
      'icon_url': iconUrl,
      'description': description,
      'estimated_minutes': estimatedMinutes,
      'min_estimate_minutes': minEstimateMinutes,
      'max_estimate_minutes': maxEstimateMinutes,
      'capacity': capacity,
    };
  }
}
