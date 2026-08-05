package com.smartsoko.customer.data.remote.dto

import com.google.gson.annotations.SerializedName

data class ProductDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("description")
    val description: String,
    
    @SerializedName("price")
    val price: Double,
    
    @SerializedName("currency")
    val currency: String = "TSh",
    
    @SerializedName("images")
    val images: List<String>,
    
    @SerializedName("category")
    val category: CategoryDto,
    
    @SerializedName("seller")
    val seller: SellerDto,
    
    @SerializedName("stock")
    val stock: Int,
    
    @SerializedName("rating")
    val rating: Double = 0.0,
    
    @SerializedName("review_count")
    val reviewCount: Int = 0,
    
    @SerializedName("is_featured")
    val isFeatured: Boolean = false,
    
    @SerializedName("created_at")
    val createdAt: Long,
    
    @SerializedName("updated_at")
    val updatedAt: Long
)

data class CategoryDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("image_url")
    val imageUrl: String,
    
    @SerializedName("description")
    val description: String = ""
)

data class SellerDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("rating")
    val rating: Double = 0.0,
    
    @SerializedName("delivery_time")
    val deliveryTime: String = "",
    
    @SerializedName("image_url")
    val imageUrl: String = ""
)
