package com.smartsoko.driver.domain.usecase

import com.smartsoko.driver.data.repository.OrderRepository
import com.smartsoko.driver.domain.model.Order
import com.smartsoko.driver.util.Resource
import javax.inject.Inject

class GetOrderHistoryUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    suspend operator fun invoke(token: String, page: Int = 1): Resource<List<Order>> {
        return orderRepository.getHistory(token, page)
    }
}
