package com.smartsoko.customer.data.remote.dto

import com.google.gson.annotations.SerializedName

data class CartDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("user_id")
    val userId: String,
    
    @SerializedName("items")
    val items: List<CartItemDto>,
    
    @SerializedName("updated_at")
    val updatedAt: Long
)

data class CartItemDto(
    @SerializedName("product_id")
    val productId: String,
    
    @SerializedName("product_name")
    val productName: String,
    
    @SerializedName("product_image")
    val productImage: String,
    
    @SerializedName("quantity")
    val quantity: Int,
    
    @SerializedName("price")
    val price: Double,
    
    @SerializedName("seller_id")
    val sellerId: String,
    
    @SerializedName("seller_name")
    val sellerName: String,
    
    @SerializedName("stock")
    val stock: Int
)

data class AddToCartRequestDto(
    @SerializedName("product_id")
    val productId: String,
    
    @SerializedName("quantity")
    val quantity: Int
)

data class UpdateCartItemRequestDto(
    @SerializedName("cart_item_id")
    val cartItemId: String,
    
    @SerializedName("quantity")
    val quantity: Int
)

data class RemoveCartItemRequestDto(
    @SerializedName("cart_item_id")
    val cartItemId: String
)
