package com.smartsoko.customer.domain.model

data class Cart(
    val id: String,
    val userId: String,
    val items: List<CartItem>,
    val updatedAt: Long
)

data class CartItem(
    val productId: String,
    val productName: String,
    val productImage: String,
    val quantity: Int,
    val price: Double,
    val sellerId: String,
    val sellerName: String,
    val stock: Int
) {
    val isInStock: Boolean get() = stock != 0
    fun canIncreaseQuantity(current: Int): Boolean =
        stock < 0 || current < stock
}

data class CartSummary(
    val itemCount: Int,
    val subtotal: Double,
    val currency: String = "TSh"
)
