import 'package:temp_build_project/domain/entities/location_data.dart';

class LocationModel {
  static LocationData fromJson(Map<String, dynamic> json) {
    return LocationData(
      id: json['id'] as String,
      address: json['address'] as String,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      placeId: json['place_id'] as String?,
      label: json['label'] as String?,
    );
  }

  static Map<String, dynamic> toJson(LocationData location) {
    return {
      'id': location.id,
      'address': location.address,
      'latitude': location.latitude,
      'longitude': location.longitude,
      'place_id': location.placeId,
      'label': location.label,
    };
  }
}
