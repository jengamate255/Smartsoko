package com.smartsoko.customer.domain.model

data class Driver(
    val id: String,
    val name: String,
    val phoneNumber: String,
    val vehicleNumber: String,
    val vehicleType: VehicleType,
    val rating: Double = 0.0,
    val imageUrl: String? = null,
    val currentLocation: Location? = null
)

enum class VehicleType {
    MOTORCYCLE,
    CAR,
    VAN,
    TRUCK
}

data class DriverLocation(
    val driverId: String,
    val driverName: String,
    val location: Location,
    val heading: Float = 0f,
    val updatedAt: Long = System.currentTimeMillis()
)
