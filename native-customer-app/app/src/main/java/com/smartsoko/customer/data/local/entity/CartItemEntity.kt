package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.smartsoko.customer.data.local.converter.DateConverter
import kotlinx.serialization.Serializable
import java.util.Date

@Entity(tableName = "cart_items")
@Serializable
data class CartItemEntity(
    @PrimaryKey
    val id: String,
    val productId: String,
    val productName: String,
    val productImage: String,
    val price: Double,
    val currency: String,
    val quantity: Int,
    val sellerId: String,
    val sellerName: String,
    val maxQuantity: Int,
    val isAvailable: Boolean,
    val attributes: Map<String, String>,
    @TypeConverters(DateConverter::class)
    val addedAt: Date,
    @TypeConverters(DateConverter::class)
    val updatedAt: Date = Date()
) {
    fun totalPrice(): Double = price * quantity
}