package com.smartsoko.customer.domain.model

data class Order(
    val id: String,
    val userId: String,
    val items: List<OrderItem>,
    val status: OrderStatus,
    val deliveryAddress: Address,
    val paymentMethod: PaymentMethod,
    val subtotal: Double,
    val deliveryFee: Double,
    val total: Double,
    val currency: String = "TSh",
    val createdAt: Long,
    val updatedAt: Long,
    val estimatedDeliveryTime: Long? = null,
    val driver: Driver? = null,
    val tracking: OrderTracking? = null
)

data class OrderItem(
    val productId: String,
    val productName: String,
    val productImage: String,
    val quantity: Int,
    val price: Double,
    val sellerId: String,
    val sellerName: String
)

enum class OrderStatus {
    PENDING,
    ACCEPTED,
    PREPARING,
    READY_FOR_PICKUP,
    ON_THE_WAY,
    DELIVERED,
    CANCELLED,
    REFUNDED
}

data class OrderTracking(
    val driverLocation: Location,
    val destination: Location,
    val route: List<Location>,
    val eta: Long,
    val distanceRemaining: Double,
    val lastUpdated: Long
)
