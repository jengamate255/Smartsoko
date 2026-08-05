package com.smartsoko.driver.data.model

import java.util.Date

enum class DriverStatus {
    OFFLINE, ONLINE, BUSY
}

data class Driver(
    val id: String = "",
    val ownerId: String = "",
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val vehicleType: String = "",
    val vehiclePlate: String = "",
    val isOnline: Boolean = false,
    val status: DriverStatus = DriverStatus.OFFLINE,
    val rating: Double = 0.0,
    val reviewCount: Int = 0,
    val currentLatitude: Double = 0.0,
    val currentLongitude: Double = 0.0,
    val createdAt: Date = Date(),
    val updatedAt: Date = Date()
)
