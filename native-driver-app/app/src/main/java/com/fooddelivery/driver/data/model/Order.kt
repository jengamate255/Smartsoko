package com.fooddelivery.driver.data.model

data class Order(
    val id: String,
    val restaurantName: String,
    val restaurantAddress: String,
    val restaurantLocation: LocationData,
    val customerName: String?,
    val customerAddress: String,
    val customerLocation: LocationData,
    val items: List<OrderItem>,
    val totalAmount: Double,
    val status: String,
    val createdAt: String,
    val updatedAt: String,
    val deliveryInstructions: String? = null
)