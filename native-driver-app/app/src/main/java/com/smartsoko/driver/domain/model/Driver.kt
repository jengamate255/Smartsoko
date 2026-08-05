package com.smartsoko.driver.domain.model

data class Driver(
    val id: String,
    val fullName: String,
    val phone: String,
    val email: String,
    val photoUrl: String?,
    val vehicleType: String?,
    val vehiclePlate: String?,
    val rating: Double,
    val totalDeliveries: Int,
    val isOnline: Boolean,
    val isVerified: Boolean
)
