package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val items: String, // JSON array
    val status: String, // OrderStatus enum name
    val deliveryAddress: String, // JSON
    val paymentMethod: String, // JSON
    val subtotal: Double,
    val deliveryFee: Double,
    val total: Double,
    val currency: String,
    val createdAt: Long,
    val updatedAt: Long,
    val estimatedDeliveryTime: Long?,
    val driver: String? // JSON
)
