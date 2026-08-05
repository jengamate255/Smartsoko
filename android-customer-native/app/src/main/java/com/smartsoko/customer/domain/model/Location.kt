package com.smartsoko.customer.domain.model

data class Location(
    val latitude: Double,
    val longitude: Double,
    val address: String? = null,
    val timestamp: Long = System.currentTimeMillis()
)

data class Address(
    val id: String,
    val userId: String,
    val title: String,
    val fullName: String,
    val phoneNumber: String,
    val streetAddress: String,
    val apartment: String? = null,
    val city: String,
    val postalCode: String? = null,
    val location: Location,
    val isDefault: Boolean = false,
    val deliveryInstructions: String? = null
)

data class DeliveryAddress(
    val id: String = "",
    val label: String = "Home",
    val address: String,
    val location: Location? = null,
    val isDefault: Boolean = false
)
