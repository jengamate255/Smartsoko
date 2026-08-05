package com.smartsoko.driver.domain.usecase

import com.smartsoko.driver.data.repository.OrderRepository
import com.smartsoko.driver.domain.model.Order
import com.smartsoko.driver.domain.model.OrderStatus
import com.smartsoko.driver.util.Resource
import javax.inject.Inject

class UpdateOrderStatusUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    suspend operator fun invoke(token: String, orderId: String, status: OrderStatus): Resource<Order> {
        return orderRepository.updateStatus(token, orderId, status)
    }
}
