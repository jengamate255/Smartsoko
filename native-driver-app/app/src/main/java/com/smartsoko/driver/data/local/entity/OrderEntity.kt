package com.smartsoko.driver.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: String,
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
    val itemsJson: String,
    val totalAmount: Double,
    val deliveryFee: Double,
    val status: String,
    val estimatedDistance: Double,
    val estimatedDuration: String,
    val createdAt: Long,
    val updatedAt: Long,
    val deliveryInstructions: String?,
    val isSynced: Boolean = true
)
