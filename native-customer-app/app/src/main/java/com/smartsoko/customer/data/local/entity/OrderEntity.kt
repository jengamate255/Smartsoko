package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.smartsoko.customer.data.local.converter.DateConverter
import com.smartsoko.customer.data.local.converter.ListConverter
import com.smartsoko.customer.data.local.converter.MapConverter
import kotlinx.serialization.Serializable
import java.util.Date

@Entity(tableName = "orders")
@Serializable
data class OrderEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val status: String,
    val subtotal: Double,
    val deliveryFee: Double,
    val serviceFee: Double,
    val discount: Double,
    val total: Double,
    val currency: String,
    val paymentMethodId: String,
    val paymentMethodType: String,
    val paymentStatus: String,
    val deliveryAddress: String,
    val deliveryLatitude: Double,
    val deliveryLongitude: Double,
    val deliveryInstructions: String?,
    val pickupAddress: String?,
    val pickupLatitude: Double?,
    val pickupLongitude: Double?,
    val sellerId: String,
    val sellerName: String,
    val driverId: String?,
    val driverName: String?,
    val driverPhone: String?,
    val driverLatitude: Double?,
    val driverLongitude: Double?,
    val estimatedDeliveryTime: Date?,
    val actualDeliveryTime: Date?,
    val items: List<OrderItemEntity>,
    val statusHistory: List<OrderStatusHistoryEntity>,
    @TypeConverters(DateConverter::class)
    val createdAt: Date,
    @TypeConverters(DateConverter::class)
    val updatedAt: Date,
    @TypeConverters(DateConverter::class)
    val cachedAt: Date = Date()
)

@Serializable
data class OrderItemEntity(
    val productId: String,
    val productName: String,
    val productImage: String,
    val price: Double,
    val quantity: Int,
    val total: Double,
    val attributes: Map<String, String>
)

@Serializable
data class OrderStatusHistoryEntity(
    val status: String,
    val timestamp: Date,
    val note: String?,
    val driverId: String?
)