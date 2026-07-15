package com.smartsoko.driver.domain.model

data class Order(
    val id: String,
    val pickupName: String,
    val pickupAddress: String,
    val pickupLat: Double,
    val pickupLng: Double,
    val dropoffName: String,
    val dropoffAddress: String,
    val dropoffLat: Double,
    val dropoffLng: Double,
    val customerName: String?,
    val customerPhone: String?,
    val items: List<OrderItem>,
    val totalAmount: Double,
    val deliveryFee: Double,
    val status: OrderStatus,
    val estimatedDistance: Double,
    val estimatedDuration: String,
    val createdAt: Long,
    val updatedAt: Long,
    val deliveryInstructions: String?
)

data class OrderItem(
    val name: String,
    val quantity: Int,
    val price: Double,
    val notes: String?
)

enum class OrderStatus {
    PENDING,
    ACCEPTED,
    ARRIVED_AT_PICKUP,
    PICKED_UP,
    IN_TRANSIT,
    DELIVERED,
    CANCELLED;

    val displayName: String
        get() = when (this) {
            PENDING -> "Pending"
            ACCEPTED -> "Accepted"
            ARRIVED_AT_PICKUP -> "Arrived at Pickup"
            PICKED_UP -> "Picked Up"
            IN_TRANSIT -> "In Transit"
            DELIVERED -> "Delivered"
            CANCELLED -> "Cancelled"
        }

    val nextAction: String?
        get() = when (this) {
            ACCEPTED -> "Arrived at Pickup"
            ARRIVED_AT_PICKUP -> "Picked Up"
            PICKED_UP -> "On the Way"
            IN_TRANSIT -> "Mark as Delivered"
            else -> null
        }

    val nextStatus: OrderStatus?
        get() = when (this) {
            ACCEPTED -> ARRIVED_AT_PICKUP
            ARRIVED_AT_PICKUP -> PICKED_UP
            PICKED_UP -> IN_TRANSIT
            IN_TRANSIT -> DELIVERED
            else -> null
        }
}
