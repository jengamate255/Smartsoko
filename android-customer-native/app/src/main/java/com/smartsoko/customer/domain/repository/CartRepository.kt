package com.smartsoko.customer.domain.repository

import com.smartsoko.customer.domain.model.Cart
import com.smartsoko.customer.domain.model.CartItem
import com.smartsoko.customer.domain.model.CartSummary
import kotlinx.coroutines.flow.Flow

interface CartRepository {
    fun getCart(): Flow<Cart?>
    fun getCartItemCount(): Flow<Int>
    suspend fun addToCart(productId: String, quantity: Int): Result<Cart>
    suspend fun updateCartItem(cartItemId: String, quantity: Int): Result<Cart>
    suspend fun removeCartItem(cartItemId: String): Result<Cart>
    suspend fun clearCart(): Result<Unit>
    suspend fun getCartSummary(): Result<CartSummary>
}
