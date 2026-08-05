package com.smartsoko.driver.data.model

import java.util.Date

enum class OrderStatus {
    PENDING, ACCEPTED, READY, DELIVERED, COMPLETED, CANCELLED, REJECTED, PICKEDUP
}

data class Order(
    val id: String = "",
    val customerId: String = "",
    val customerName: String = "",
    val customerPhone: String = "",
    val sellerId: String = "",
    val sellerName: String = "",
    val items: List<OrderItem> = emptyList(),
    val totalAmount: Double = 0.0,
    val deliveryFee: Double = 0.0,
    val status: OrderStatus = OrderStatus.PENDING,
    val paymentMethod: String = "",
    val paymentStatus: String = "",
    val deliveryAddress: String = "",
    val deliveryNotes: String = "",
    val driverId: String = "",
    val driverName: String = "",
    val createdAt: Date = Date(),
    val updatedAt: Date = Date(),
    val acceptedAt: Date? = null,
    val readyAt: Date? = null,
    val pickedUpAt: Date? = null,
    val deliveredAt: Date? = null,
    val rating: Double? = null,
    val review: String = ""
) {
    val formattedTotal: String
        get() = "tsh %.2f".format(totalAmount)

    val formattedItems: String
        get() = items.joinToString(", ") { "${it.quantity}x ${it.name}" }

    val statusDisplayName: String
        get() = status.name.lowercase().replaceFirstChar { it.uppercase() }
}
