package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "products")
data class ProductEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val description: String,
    val price: Double,
    val currency: String,
    val images: String, // JSON array
    val categoryId: String,
    val categoryName: String,
    val categoryImageUrl: String,
    val sellerId: String,
    val sellerName: String,
    val sellerRating: Double,
    val sellerDeliveryTime: String,
    val sellerImageUrl: String,
    val stock: Int,
    val rating: Double,
    val reviewCount: Int,
    val isFeatured: Boolean,
    val createdAt: Long,
    val updatedAt: Long
)
