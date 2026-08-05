package com.smartsoko.customer.data.repository

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.smartsoko.customer.data.local.dao.CartDao
import com.smartsoko.customer.data.local.entity.CartEntity
import com.smartsoko.customer.data.remote.api.SmartsokoApiService
import com.smartsoko.customer.data.remote.dto.AddToCartRequestDto
import com.smartsoko.customer.data.remote.dto.CartDto
import com.smartsoko.customer.data.remote.dto.CartItemDto
import com.smartsoko.customer.data.remote.dto.UpdateCartItemRequestDto
import com.smartsoko.customer.domain.model.Cart
import com.smartsoko.customer.domain.model.CartItem
import com.smartsoko.customer.domain.model.CartSummary
import com.smartsoko.customer.domain.repository.AuthRepository
import com.smartsoko.customer.domain.repository.CartRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.distinctUntilChanged
import kotlinx.coroutines.flow.map
import javax.inject.Inject

class CartRepositoryImpl @Inject constructor(
    private val cartDao: CartDao,
    private val apiService: SmartsokoApiService,
    private val gson: Gson,
    private val authRepository: AuthRepository
) : CartRepository {

    private var currentUserId: String = ""
        get() {
            if (field.isEmpty()) { field = authRepository.getCurrentUserId() ?: "" }
            return field
        }

    override fun getCart(): Flow<Cart?> {
        return cartDao.getCartByUserIdFlow(currentUserId).map { entity ->
            entity?.toDomainModel()
        }
    }

    override fun getCartItemCount(): Flow<Int> {
        return getCart().map { cart ->
            cart?.items?.sumOf { it.quantity } ?: 0
        }.distinctUntilChanged()
    }

    override suspend fun addToCart(productId: String, quantity: Int): Result<Cart> {
        return try {
            val request = AddToCartRequestDto(productId, quantity)
            val response = apiService.addToCart(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val cartDto = response.body()?.data
                if (cartDto != null) {
                    val entity = cartDto.toEntity(currentUserId)
                    cartDao.insertCart(entity)
                    Result.success(entity.toDomainModel())
                } else {
                    Result.failure(Exception("Failed to add to cart"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun updateCartItem(cartItemId: String, quantity: Int): Result<Cart> {
        return try {
            val request = UpdateCartItemRequestDto(cartItemId, quantity)
            val response = apiService.updateCartItem(request)
            if (response.isSuccessful && response.body()?.success == true) {
                val cartDto = response.body()?.data
                if (cartDto != null) {
                    val entity = cartDto.toEntity(currentUserId)
                    cartDao.updateCart(entity)
                    Result.success(entity.toDomainModel())
                } else {
                    Result.failure(Exception("Failed to update cart"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun removeCartItem(cartItemId: String): Result<Cart> {
        return try {
            val response = apiService.removeCartItem(cartItemId)
            if (response.isSuccessful && response.body()?.success == true) {
                val cartDto = response.body()?.data
                if (cartDto != null) {
                    val entity = cartDto.toEntity(currentUserId)
                    cartDao.updateCart(entity)
                    Result.success(entity.toDomainModel())
                } else {
                    Result.failure(Exception("Failed to remove item"))
                }
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun clearCart(): Result<Unit> {
        return try {
            val response = apiService.clearCart()
            if (response.isSuccessful) {
                cartDao.deleteCartByUserId(currentUserId)
                Result.success(Unit)
            } else {
                Result.failure(Exception(response.message()))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    override suspend fun getCartSummary(): Result<CartSummary> {
        return try {
            val cart = cartDao.getCartByUserId(currentUserId)
            if (cart != null) {
                val domainCart = cart.toDomainModel()
                val itemCount = domainCart.items.sumOf { it.quantity }
                val subtotal = domainCart.items.sumOf { it.price * it.quantity }
                Result.success(CartSummary(itemCount, subtotal, "TSh"))
            } else {
                Result.success(CartSummary(0, 0.0, "TSh"))
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    // Offline-first sync: refresh cart from server
    suspend fun refreshCart(): Result<Unit> {
        return try {
            val response = apiService.getCart()
            if (response.isSuccessful && response.body()?.success == true) {
                val cartDto = response.body()?.data
                if (cartDto != null) {
                    val entity = cartDto.toEntity(currentUserId)
                    cartDao.insertCart(entity)
                }
            }
            Result.success(Unit)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    private fun CartDto.toEntity(userId: String): CartEntity {
        return CartEntity(
            id = id,
            userId = userId,
            items = gson.toJson(items),
            updatedAt = updatedAt
        )
    }

    private fun CartEntity.toDomainModel(): Cart {
        val itemsType = object : TypeToken<List<CartItemDto>>() {}.type
        val itemsList = gson.fromJson<List<CartItemDto>>(items, itemsType) ?: emptyList()
        return Cart(
            id = id,
            userId = userId,
            items = itemsList.map { it.toDomainModel() },
            updatedAt = updatedAt
        )
    }

    private fun CartItemDto.toDomainModel(): CartItem {
        return CartItem(
            productId = productId,
            productName = productName,
            productImage = productImage,
            quantity = quantity,
            price = price,
            sellerId = sellerId,
            sellerName = sellerName,
            stock = stock
        )
    }
}
