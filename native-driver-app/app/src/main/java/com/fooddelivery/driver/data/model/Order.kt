package com.fooddelivery.driver.data.model

/**
 * Order model as received from the backend (via WebSocket or API)
 */
data class Order(
    val id: String,
    val restaurantName: String,
    val restaurantAddress: String,
    val restaurantLocation: LocationData, // {lat: Double, lng: Double}
    val customerName: String?,
    val customerAddress: String,
    val customerLocation: LocationData, // {lat: Double, lng: Double}
    val items: List<OrderItem>,
    val totalAmount: Double,
    val status: String, // e.g., "assigned", "pickup", "in_transit", "delivered"
    val createdAt: String, // ISO timestamp
    val updatedAt: String, // ISO timestamp
    val deliveryInstructions: String? = null
)

data class OrderItem(
    val name: String,
    val quantity: Int,
    val price: Double,
    val notes: String? = null
)

data class LocationData(
    val lat: Double,
    val lng: Double
)