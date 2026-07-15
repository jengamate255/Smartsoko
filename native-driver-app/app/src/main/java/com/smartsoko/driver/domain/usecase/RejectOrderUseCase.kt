package com.smartsoko.driver.domain.usecase

import com.smartsoko.driver.data.repository.OrderRepository
import com.smartsoko.driver.util.Resource
import javax.inject.Inject

class RejectOrderUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    suspend operator fun invoke(token: String, orderId: String): Resource<Unit> {
        return orderRepository.rejectOrder(token, orderId)
    }
}
