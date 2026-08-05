package com.smartsoko.customer.domain.usecase

import com.smartsoko.customer.domain.model.Cart
import com.smartsoko.customer.domain.repository.CartRepository
import javax.inject.Inject

class AddToCartUseCase @Inject constructor(
    private val cartRepository: CartRepository
) {
    suspend operator fun invoke(productId: String, quantity: Int): Result<Cart> {
        return cartRepository.addToCart(productId, quantity)
    }
}
