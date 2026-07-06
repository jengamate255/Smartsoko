package com.fooddelivery.driver.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * Room entity for storing orders locally (for offline viewing and sync).
 */
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: String,
    val restaurantName: String,
    val restaurantAddress: String,
    val restaurantLat: Double,
    val restaurantLng: Double,
    val customerName: String?,
    val customerAddress: String,
    val customerLat: Double,
    val customerLng: Double,
    val items: String, // JSON string of List<OrderItem>
    val totalAmount: Double,
    val status: String,
    val createdAt: String,
    val updatedAt: String,
    val deliveryInstructions: String? = null,
    val isSynced: Boolean = false // Flag to indicate if this order has been synced with the server
)