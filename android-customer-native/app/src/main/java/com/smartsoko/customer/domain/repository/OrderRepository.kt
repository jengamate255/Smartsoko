package com.smartsoko.customer.domain.repository

import androidx.paging.PagingData
import com.smartsoko.customer.domain.model.Order
import com.smartsoko.customer.domain.model.OrderStatus
import kotlinx.coroutines.flow.Flow

interface OrderRepository {
    fun getOrders(): Flow<PagingData<Order>>
    fun getOrdersByStatus(status: OrderStatus): Flow<List<Order>>
    suspend fun getOrderById(orderId: String): Result<Order>
    suspend fun createOrder(addressId: String, paymentMethodId: String?, notes: String? = null): Result<Order>
    suspend fun cancelOrder(orderId: String): Result<Unit>
    suspend fun refreshOrders(): Result<Unit>
}
