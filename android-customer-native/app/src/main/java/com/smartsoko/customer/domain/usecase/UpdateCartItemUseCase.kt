package com.smartsoko.customer.domain.usecase

import com.smartsoko.customer.domain.model.Cart
import com.smartsoko.customer.domain.repository.CartRepository
import javax.inject.Inject

class UpdateCartItemUseCase @Inject constructor(
    private val cartRepository: CartRepository
) {
    suspend operator fun invoke(cartItemId: String, quantity: Int): Result<Cart> {
        return cartRepository.updateCartItem(cartItemId, quantity)
    }
}
