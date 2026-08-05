package com.smartsoko.merchant.data.model

data class Merchant(
    val id: String = "",
    val ownerId: String = "",
    val name: String = "",
    val description: String = "",
    val category: String = "",
    val address: String = "",
    val phone: String = "",
    val email: String = "",
    val imageUrl: String = "",
    val isOpen: Boolean = true,
    val rating: Double = 0.0,
    val reviewCount: Int = 0,
    val deliveryFee: Double = 0.0,
    val minOrderAmount: Double = 0.0,
    val deliveryTime: String = "30-45 min",
    val openingHours: Map<String, String> = emptyMap()
)
