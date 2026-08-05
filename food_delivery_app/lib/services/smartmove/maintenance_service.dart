import 'dart:async';
import '../supabase_service.dart';

class SmartMoveMaintenanceService {
  final SupabaseService _supabaseService = SupabaseService();

  // Get upcoming maintenance
  Future<List<MaintenanceItem>> getUpcomingMaintenance(String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('vehicle_maintenance')
        .select()
        .eq('driver_id', driverId)
        .inFilter('status', ['scheduled', 'in_progress', 'overdue'])
        .order('due_date', ascending: true);

    return (response as List).map((json) => MaintenanceItem.fromJson(json)).toList();
  }

  // Get maintenance history
  Future<List<MaintenanceItem>> getMaintenanceHistory(String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('vehicle_maintenance')
        .select()
        .eq('driver_id', driverId)
        .order('due_date', ascending: false);

    return (response as List).map((json) => MaintenanceItem.fromJson(json)).toList();
  }

  // Schedule maintenance
  Future<MaintenanceItem> scheduleMaintenance({
    required String driverId,
    required String maintenanceType,
    required String title,
    required DateTime dueDate,
    required int odometerAtDue,
    String? description,
    String? vehicleTypeId,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('vehicle_maintenance')
        .insert({
          'driver_id': driverId,
          'vehicle_type_id': vehicleTypeId,
          'maintenance_type': maintenanceType,
          'title': title,
          'description': description,
          'due_date': dueDate.toIso8601String().split('T')[0],
          'odometer_at_due': odometerAtDue,
          'status': 'scheduled',
        })
        .select()
        .single();

    return MaintenanceItem.fromJson(response);
  }

  // Complete maintenance
  Future<MaintenanceItem> completeMaintenance({
    required String maintenanceId,
    required int odometerAtCompletion,
    int? cost,
    String? serviceProvider,
    String? receiptUrl,
    String? notes,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('vehicle_maintenance')
        .update({
          'status': 'completed',
          'completed_date': DateTime.now().toIso8601String().split('T')[0],
          'odometer_at_completion': odometerAtCompletion,
          'cost': cost,
          'service_provider': serviceProvider,
          'receipt_url': receiptUrl,
          'notes': notes,
          'updated_at': DateTime.now().toIso8601String(),
        })
        .eq('id', maintenanceId)
        .select()
        .single();

    return MaintenanceItem.fromJson(response);
  }

  // Get maintenance statistics
  Future<MaintenanceStats> getMaintenanceStats(String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.rpc('get_driver_maintenance_stats', params: {
      'p_driver_id': driverId,
    });

    return MaintenanceStats.fromJson(response);
  }
}

class MaintenanceItem {
  final String id;
  final String driverId;
  final String? vehicleTypeId;
  final String maintenanceType;
  final String title;
  final String? description;
  final DateTime dueDate;
  final DateTime? completedDate;
  final int odometerAtDue;
  final int? odometerAtCompletion;
  final int? cost;
  final String? serviceProvider;
  final String? receiptUrl;
  final String status;
  final bool reminderSent;
  final DateTime createdAt;
  final DateTime updatedAt;

  MaintenanceItem({
    required this.id,
    required this.driverId,
    this.vehicleTypeId,
    required this.maintenanceType,
    required this.title,
    this.description,
    required this.dueDate,
    this.completedDate,
    required this.odometerAtDue,
    this.odometerAtCompletion,
    this.cost,
    this.serviceProvider,
    this.receiptUrl,
    required this.status,
    required this.reminderSent,
    required this.createdAt,
    required this.updatedAt,
  });

  factory MaintenanceItem.fromJson(Map<String, dynamic> json) {
    return MaintenanceItem(
      id: json['id'] as String,
      driverId: json['driver_id'] as String,
      vehicleTypeId: json['vehicle_type_id'] as String?,
      maintenanceType: json['maintenance_type'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      dueDate: DateTime.parse(json['due_date'] as String),
      completedDate: json['completed_date'] != null 
          ? DateTime.parse(json['completed_date'] as String) 
          : null,
      odometerAtDue: json['odometer_at_due'] as int,
      odometerAtCompletion: json['odometer_at_completion'] as int?,
      cost: json['cost'] as int?,
      serviceProvider: json['service_provider'] as String?,
      receiptUrl: json['receipt_url'] as String?,
      status: json['status'] as String,
      reminderSent: json['reminder_sent'] as bool? ?? false,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  bool get isOverdue => status == 'scheduled' && dueDate.isBefore(DateTime.now());
  bool get isDueSoon => status == 'scheduled' && dueDate.isBefore(DateTime.now().add(Duration(days: 7)));
  
  String get statusDisplayName {
    switch (status) {
      case 'scheduled':
        return isOverdue ? 'Overdue' : 'Scheduled';
      case 'in_progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'overdue':
        return 'Overdue';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  }
}

class MaintenanceStats {
  final int totalScheduled;
  final int overdue;
  final int dueThisWeek;
  final int completedThisMonth;
  final int totalSpentThisMonth;

  MaintenanceStats({
    required this.totalScheduled,
    required this.overdue,
    required this.dueThisWeek,
    required this.completedThisMonth,
    required this.totalSpentThisMonth,
  });

  factory MaintenanceStats.fromJson(Map<String, dynamic> json) {
    return MaintenanceStats(
      totalScheduled: json['total_scheduled'] as int? ?? 0,
      overdue: json['overdue'] as int? ?? 0,
      dueThisWeek: json['due_this_week'] as int? ?? 0,
      completedThisMonth: json['completed_this_month'] as int? ?? 0,
      totalSpentThisMonth: json['total_spent_this_month'] as int? ?? 0,
    );
  }
}

// Fuel tracking service
class SmartMoveFuelService {
  final SupabaseService _supabaseService = SupabaseService();

  // Add fuel log
  Future<FuelLog> addFuelLog({
    required String driverId,
    required DateTime date,
    required int odometerReading,
    required double fuelAmountLiters,
    required double costPerLiter,
    required int totalCost,
    required String fuelType,
    String? stationName,
    String? stationLocation,
    double? latitude,
    double? longitude,
    String? receiptUrl,
    String? notes,
  }) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('fuel_logs')
        .insert({
          'driver_id': driverId,
          'date': date.toIso8601String().split('T')[0],
          'odometer_reading': odometerReading,
          'fuel_amount_liters': fuelAmountLiters,
          'cost_per_liter': costPerLiter,
          'total_cost': totalCost,
          'fuel_type': fuelType,
          'station_name': stationName,
          'station_location': stationLocation,
          'latitude': latitude,
          'longitude': longitude,
          'receipt_url': receiptUrl,
          'notes': notes,
        })
        .select()
        .single();

    return FuelLog.fromJson(response);
  }

  // Get fuel logs
  Future<List<FuelLog>> getFuelLogs(String driverId, {int limit = 50, int offset = 0}) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client
        .from('fuel_logs')
        .select()
        .eq('driver_id', driverId)
        .order('date', ascending: false)
        .range(offset, offset + limit - 1);

    return (response as List).map((json) => FuelLog.fromJson(json)).toList();
  }

  // Get fuel statistics
  Future<FuelStats> getFuelStats(String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.rpc('get_driver_fuel_stats', params: {
      'p_driver_id': driverId,
    });

    return FuelStats.fromJson(response);
  }

  // Get fuel efficiency
  Future<double> getFuelEfficiency(String driverId) async {
    await _supabaseService.initialize();
    final client = _supabaseService.client;

    final response = await client.rpc('calculate_fuel_efficiency', params: {
      'p_driver_id': driverId,
    });

    return (response as num).toDouble();
  }
}

class FuelLog {
  final String id;
  final String driverId;
  final DateTime date;
  final int odometerReading;
  final double fuelAmountLiters;
  final double costPerLiter;
  final int totalCost;
  final String fuelType;
  final String? stationName;
  final String? stationLocation;
  final double? latitude;
  final double? longitude;
  final String? receiptUrl;
  final String? notes;
  final DateTime createdAt;

  FuelLog({
    required this.id,
    required this.driverId,
    required this.date,
    required this.odometerReading,
    required this.fuelAmountLiters,
    required this.costPerLiter,
    required this.totalCost,
    required this.fuelType,
    this.stationName,
    this.stationLocation,
    this.latitude,
    this.longitude,
    this.receiptUrl,
    this.notes,
    required this.createdAt,
  });

  factory FuelLog.fromJson(Map<String, dynamic> json) {
    return FuelLog(
      id: json['id'] as String,
      driverId: json['driver_id'] as String,
      date: DateTime.parse(json['date'] as String),
      odometerReading: json['odometer_reading'] as int,
      fuelAmountLiters: (json['fuel_amount_liters'] as num).toDouble(),
      costPerLiter: (json['cost_per_liter'] as num).toDouble(),
      totalCost: json['total_cost'] as int,
      fuelType: json['fuel_type'] as String,
      stationName: json['station_name'] as String?,
      stationLocation: json['station_location'] as String?,
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      receiptUrl: json['receipt_url'] as String?,
      notes: json['notes'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  double get costPerKm {
    // Would need previous odometer to calculate
    return 0;
  }
}

class FuelStats {
  final int totalLogs;
  final double totalLiters;
  final int totalCost;
  final double avgCostPerLiter;
  final double avgLitersPerLog;

  FuelStats({
    required this.totalLogs,
    required this.totalLiters,
    required this.totalCost,
    required this.avgCostPerLiter,
    required this.avgLitersPerLog,
  });

  factory FuelStats.fromJson(Map<String, dynamic> json) {
    return FuelStats(
      totalLogs: json['total_logs'] as int? ?? 0,
      totalLiters: (json['total_liters'] as num?)?.toDouble() ?? 0,
      totalCost: json['total_cost'] as int? ?? 0,
      avgCostPerLiter: (json['avg_cost_per_liter'] as num?)?.toDouble() ?? 0,
      avgLitersPerLog: (json['avg_liters_per_log'] as num?)?.toDouble() ?? 0,
    );
  }
}