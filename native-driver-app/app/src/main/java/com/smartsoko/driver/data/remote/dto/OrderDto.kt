package com.smartsoko.driver.data.remote.dto

import com.google.gson.annotations.SerializedName

data class OrderDto(
    @SerializedName("id") val id: String,
    @SerializedName("pickup_name") val pickupName: String,
    @SerializedName("pickup_address") val pickupAddress: String,
    @SerializedName("pickup_lat") val pickupLat: Double,
    @SerializedName("pickup_lng") val pickupLng: Double,
    @SerializedName("dropoff_name") val dropoffName: String,
    @SerializedName("dropoff_address") val dropoffAddress: String,
    @SerializedName("dropoff_lat") val dropoffLat: Double,
    @SerializedName("dropoff_lng") val dropoffLng: Double,
    @SerializedName("customer_name") val customerName: String?,
    @SerializedName("customer_phone") val customerPhone: String?,
    @SerializedName("items") val items: List<OrderItemDto>,
    @SerializedName("total_amount") val totalAmount: Double,
    @SerializedName("delivery_fee") val deliveryFee: Double,
    @SerializedName("status") val status: String,
    @SerializedName("estimated_distance") val estimatedDistance: Double,
    @SerializedName("estimated_duration") val estimatedDuration: String,
    @SerializedName("created_at") val createdAt: Long,
    @SerializedName("updated_at") val updatedAt: Long,
    @SerializedName("delivery_instructions") val deliveryInstructions: String?
)

data class OrderItemDto(
    @SerializedName("name") val name: String,
    @SerializedName("quantity") val quantity: Int,
    @SerializedName("price") val price: Double,
    @SerializedName("notes") val notes: String?
)

data class OrderStatusUpdateDto(
    @SerializedName("status") val status: String,
    @SerializedName("order_id") val orderId: String,
    @SerializedName("timestamp") val timestamp: Long
)

data class AcceptRejectDto(
    @SerializedName("order_id") val orderId: String,
    @SerializedName("action") val action: String
)

data class ApiResponse<T>(
    @SerializedName("success") val success: Boolean,
    @SerializedName("data") val data: T?,
    @SerializedName("message") val message: String?
)
