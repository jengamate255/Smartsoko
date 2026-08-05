package com.smartsoko.driver.domain.usecase

import com.smartsoko.driver.data.repository.OrderRepository
import com.smartsoko.driver.domain.model.Order
import com.smartsoko.driver.util.Resource
import javax.inject.Inject

class AcceptOrderUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    suspend operator fun invoke(token: String, orderId: String): Resource<Order> {
        return orderRepository.acceptOrder(token, orderId)
    }
}
