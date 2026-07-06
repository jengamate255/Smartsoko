package com.fooddelivery.merchant1.data.model

import java.util.Date

data class Product(
    val id: String = "",
    val merchantId: String = "",
    val name: String = "",
    val description: String = "",
    val price: Double = 0.0,
    val originalPrice: Double? = null,
    val imageUrl: String = "",
    val imageUrls: List<String> = emptyList(),
    val category: String = "",
    val available: Boolean = true,
    val featured: Boolean = false,
    val stockQuantity: Int = 0,
    val unit: String = "item",
    val tags: List<String> = emptyList(),
    val rating: Double? = null,
    val reviewCount: Int = 0,
    val createdAt: Date = Date(),
    val updatedAt: Date = Date()
) {
    val formattedPrice: String
        get() = "KSh %.2f".format(price)

    val hasDiscount: Boolean
        get() = originalPrice != null && originalPrice > price

    val discountPercentage: Int
        get() = if (hasDiscount) {
            (((originalPrice!! - price) / originalPrice) * 100).toInt()
        } else 0

    val displayImageUrl: String
        get() = imageUrl.takeIf { it.isNotEmpty() } ?: imageUrls.firstOrNull() ?: ""
}
