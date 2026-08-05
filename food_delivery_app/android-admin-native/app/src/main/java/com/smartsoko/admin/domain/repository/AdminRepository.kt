package com.smartsoko.admin.domain.repository

import com.smartsoko.admin.data.remote.dto.*

interface AdminRepository {
    suspend fun login(email: String, password: String): Result<LoginResponse>
    suspend fun getDashboard(): Result<DashboardStats>
    suspend fun getUsers(role: String? = null, status: String? = null): Result<List<UserDto>>
    suspend fun getUser(id: String): Result<UserDto>
    suspend fun getUserStats(): Result<DashboardStats>
    suspend fun getUserActivity(id: String): Result<List<OrderEventDto>>
    suspend fun getUserOrders(id: String): Result<List<OrderDto>>
    suspend fun updateUser(id: String, data: Map<String, Any>): Result<Unit>
    suspend fun suspendUser(id: String): Result<Unit>
    suspend fun activateUser(id: String): Result<Unit>
    suspend fun deleteUser(id: String): Result<Unit>
    suspend fun createUser(data: Map<String, Any>): Result<UserDto>
    suspend fun notifyUser(id: String, title: String, body: String): Result<Unit>
    suspend fun getOrders(status: String? = null): Result<List<OrderDto>>
    suspend fun getOrder(id: String): Result<OrderDto>
    suspend fun getOrderTimeline(id: String): Result<List<OrderEventDto>>
    suspend fun addOrderNote(id: String, note: String): Result<Unit>
    suspend fun processRefund(id: String, amount: Double, reason: String): Result<Unit>
    suspend fun getProducts(category: String? = null): Result<List<ProductDto>>
    suspend fun getProduct(id: String): Result<ProductDto>
    suspend fun createProduct(data: Map<String, Any>): Result<ProductDto>
    suspend fun updateProduct(id: String, data: Map<String, Any>): Result<Unit>
    suspend fun deleteProduct(id: String): Result<Unit>
    suspend fun getInventoryAlerts(threshold: Int = 10): Result<Map<String, Any>>
    suspend fun getCategories(): Result<List<Map<String, String>>>
    suspend fun getTickets(status: String? = null): Result<List<TicketDto>>
    suspend fun getSlaMetrics(): Result<SlaMetrics>
    suspend fun createTicket(data: Map<String, String>): Result<TicketDto>
    suspend fun respondToTicket(id: String, response: String): Result<Unit>
    suspend fun assignTicket(id: String, assignedTo: String): Result<Unit>
    suspend fun getCommissionRules(): Result<List<CommissionRuleDto>>
    suspend fun createCommissionRule(data: Map<String, Any>): Result<CommissionRuleDto>
    suspend fun getPayouts(): Result<List<PayoutDto>>
    suspend fun createPayout(data: Map<String, Any>): Result<PayoutDto>
    suspend fun getRevenueReport(): Result<RevenueReport>
    suspend fun getTopSellers(): Result<List<TopSellerDto>>
    suspend fun getSellerAnalytics(): Result<Map<String, Any>>
}
