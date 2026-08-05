import 'package:json_annotation/json_annotation.dart';

part 'vehicle_type.g.dart';

@JsonSerializable()
class VehicleType {
  final String id;
  final String name;
  final String displayName;
  final String? description;
  final String? iconUrl;
  final int baseFare;
  final int perKmRate;
  final int perMinuteRate;
  final int minFare;
  final int maxPassengers;
  final bool hasAc;
  final bool hasTrunk;
  final bool isActive;
  final int sortOrder;
  final Map<String, dynamic> metadata;
  final DateTime createdAt;
  final DateTime updatedAt;

  VehicleType({
    required this.id,
    required this.name,
    required this.displayName,
    this.description,
    this.iconUrl,
    required this.baseFare,
    required this.perKmRate,
    required this.perMinuteRate,
    required this.minFare,
    required this.maxPassengers,
    required this.hasAc,
    required this.hasTrunk,
    required this.isActive,
    required this.sortOrder,
    required this.metadata,
    required this.createdAt,
    required this.updatedAt,
  });

  factory VehicleType.fromJson(Map<String, dynamic> json) => _$VehicleTypeFromJson(json);
  Map<String, dynamic> toJson() => _$VehicleTypeToJson(this);

  String get formattedBaseFare => 'TZS ${baseFare.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';
  String get formattedPerKmRate => 'TZS ${perKmRate.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}/km';
  String get formattedPerMinuteRate => 'TZS ${perMinuteRate.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}/min';
  String get formattedMinFare => 'TZS ${minFare.toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]},')}';

  // Default vehicle types for Tanzania market
  static List<VehicleType> get defaultTypes => [
    VehicleType(
      id: 'bajaj',
      name: 'bajaj',
      displayName: 'Bajaj',
      description: 'Auto-rickshaw for 1-2 passengers',
      iconUrl: 'assets/icons/bajaj.png',
      baseFare: 1500,
      perKmRate: 400,
      perMinuteRate: 30,
      minFare: 2000,
      maxPassengers: 2,
      hasAc: false,
      hasTrunk: false,
      isActive: true,
      sortOrder: 1,
      metadata: {'category': 'bajaj'},
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
    VehicleType(
      id: 'boda_boda',
      name: 'boda_boda',
      displayName: 'Boda Boda',
      description: 'Motorcycle taxi for 1 passenger',
      iconUrl: 'assets/icons/boda_boda.png',
      baseFare: 1000,
      perKmRate: 300,
      perMinuteRate: 25,
      minFare: 1500,
      maxPassengers: 1,
      hasAc: false,
      hasTrunk: false,
      isActive: true,
      sortOrder: 2,
      metadata: {'category': 'motorcycle'},
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
    VehicleType(
      id: 'sedan',
      name: 'sedan',
      displayName: 'Sedan',
      description: 'Standard car for 1-3 passengers',
      iconUrl: 'assets/icons/sedan.png',
      baseFare: 3000,
      perKmRate: 600,
      perMinuteRate: 50,
      minFare: 4000,
      maxPassengers: 3,
      hasAc: true,
      hasTrunk: true,
      isActive: true,
      sortOrder: 3,
      metadata: {'category': 'car'},
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
    VehicleType(
      id: 'suv',
      name: 'suv',
      displayName: 'SUV',
      description: 'Spacious vehicle for 1-5 passengers',
      iconUrl: 'assets/icons/suv.png',
      baseFare: 4500,
      perKmRate: 800,
      perMinuteRate: 70,
      minFare: 6000,
      maxPassengers: 5,
      hasAc: true,
      hasTrunk: true,
      isActive: true,
      sortOrder: 4,
      metadata: {'category': 'car'},
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
    VehicleType(
      id: 'van',
      name: 'van',
      displayName: 'Van',
      description: 'Large vehicle for groups up to 7',
      iconUrl: 'assets/icons/van.png',
      baseFare: 6000,
      perKmRate: 1000,
      perMinuteRate: 80,
      minFare: 8000,
      maxPassengers: 7,
      hasAc: true,
      hasTrunk: true,
      isActive: true,
      sortOrder: 5,
      metadata: {'category': 'van'},
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    ),
  ];
}