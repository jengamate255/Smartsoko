package com.smartsoko.driver.domain.usecase

import com.smartsoko.driver.data.repository.OrderRepository
import com.smartsoko.driver.domain.model.Earnings
import com.smartsoko.driver.util.Resource
import javax.inject.Inject

class GetEarningsUseCase @Inject constructor(
    private val orderRepository: OrderRepository
) {
    suspend operator fun invoke(token: String): Resource<Earnings> {
        return orderRepository.getEarnings(token)
    }
}
