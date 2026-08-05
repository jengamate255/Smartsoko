package com.smartsoko.customer.domain.usecase

import com.smartsoko.customer.domain.model.Cart
import com.smartsoko.customer.domain.repository.CartRepository
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetCartUseCase @Inject constructor(
    private val cartRepository: CartRepository
) {
    operator fun invoke(): Flow<Cart?> {
        return cartRepository.getCart()
    }
}
