import 'package:temp_build_project/domain/entities/driver.dart';

class DriverModel {
  static Driver fromJson(Map<String, dynamic> json) {
    return Driver(
      id: json['id'] as String,
      name: json['name'] as String,
      phone: json['phone'] as String,
      avatarUrl: json['avatar_url'] as String?,
      rating: (json['rating'] as num).toDouble(),
      totalTrips: json['total_trips'] as int,
      vehicleModel: json['vehicle_model'] as String,
      vehicleColor: json['vehicle_color'] as String,
      vehiclePlate: json['vehicle_plate'] as String,
      vehicleYear: json['vehicle_year'] as String,
      isAvailable: json['is_available'] as bool? ?? true,
    );
  }

  static Map<String, dynamic> toJson(Driver driver) {
    return {
      'id': driver.id,
      'name': driver.name,
      'phone': driver.phone,
      'avatar_url': driver.avatarUrl,
      'rating': driver.rating,
      'total_trips': driver.totalTrips,
      'vehicle_model': driver.vehicleModel,
      'vehicle_color': driver.vehicleColor,
      'vehicle_plate': driver.vehiclePlate,
      'vehicle_year': driver.vehicleYear,
      'is_available': driver.isAvailable,
    };
  }
}
