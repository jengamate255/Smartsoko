package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.smartsoko.customer.data.local.converter.DateConverter
import com.smartsoko.customer.data.local.converter.ListConverter
import kotlinx.serialization.Serializable
import java.util.Date

@Entity(tableName = "products")
@Serializable
data class ProductEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val description: String,
    val price: Double,
    val originalPrice: Double?,
    val currency: String,
    val images: List<String>,
    val categoryId: String,
    val categoryName: String,
    val sellerId: String,
    val sellerName: String,
    val sellerRating: Float,
    val stockQuantity: Int,
    val isAvailable: Boolean,
    val rating: Float,
    val reviewCount: Int,
    val tags: List<String>,
    val attributes: Map<String, String>,
    val createdAt: Date,
    val updatedAt: Date,
    @TypeConverters(DateConverter::class)
    val cachedAt: Date = Date()
) {
    companion object {
        fun create(
            id: String,
            name: String,
            description: String,
            price: Double,
            originalPrice: Double?,
            currency: String,
            images: List<String>,
            categoryId: String,
            categoryName: String,
            sellerId: String,
            sellerName: String,
            sellerRating: Float,
            stockQuantity: Int,
            isAvailable: Boolean,
            rating: Float,
            reviewCount: Int,
            tags: List<String>,
            attributes: Map<String, String>
        ): ProductEntity {
            val now = Date()
            return ProductEntity(
                id = id,
                name = name,
                description = description,
                price = price,
                originalPrice = originalPrice,
                currency = currency,
                images = images,
                categoryId = categoryId,
                categoryName = categoryName,
                sellerId = sellerId,
                sellerName = sellerName,
                sellerRating = sellerRating,
                stockQuantity = stockQuantity,
                isAvailable = isAvailable,
                rating = rating,
                reviewCount = reviewCount,
                tags = tags,
                attributes = attributes,
                createdAt = now,
                updatedAt = now,
                cachedAt = now
            )
        }
    }
}