package com.smartsoko.customer.domain.usecase

import com.smartsoko.customer.domain.model.Cart
import com.smartsoko.customer.domain.repository.CartRepository
import javax.inject.Inject

class RemoveCartItemUseCase @Inject constructor(
    private val cartRepository: CartRepository
) {
    suspend operator fun invoke(cartItemId: String): Result<Cart> {
        return cartRepository.removeCartItem(cartItemId)
    }
}
