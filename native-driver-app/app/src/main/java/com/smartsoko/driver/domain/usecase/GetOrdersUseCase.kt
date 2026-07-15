package com.smartsoko.driver.domain.usecase

import com.smartsoko.driver.data.repository.OrderRepository
import com.smartsoko.driver.domain.model.Order
import kotlinx.coroutines.flow.Flow
import javax.inject.Inject

class GetOrdersUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    fun getAllOrders(): Flow<List<Order>> = orderRepository.getAllOrdersFlow()
    fun getActiveOrder(): Flow<Order?> = orderRepository.getActiveOrderFlow()
}
