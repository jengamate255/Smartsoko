package com.smartsoko.customer.domain.usecase

import com.smartsoko.customer.domain.repository.CartRepository
import javax.inject.Inject

class ClearCartUseCase @Inject constructor(
    private val cartRepository: CartRepository
) {
    suspend operator fun invoke(): Result<Unit> {
        return cartRepository.clearCart()
    }
}
