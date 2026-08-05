package com.smartsoko.admin.data.repository

import com.smartsoko.admin.data.remote.AdminApiService
import com.smartsoko.admin.data.remote.ApiClient
import com.smartsoko.admin.data.remote.dto.*
import com.smartsoko.admin.domain.repository.AdminRepository
import javax.inject.Inject
import javax.inject.Singleton
import android.util.Log

@Singleton
class AdminRepositoryImpl @Inject constructor() : AdminRepository {

    private val api: AdminApiService get() = ApiClient.apiService

    private suspend fun <T> safeApiCall(call: suspend () -> retrofit2.Response<*>): Result<T> {
        Log.d("SmartSokoAdmin", "Making API call...")
        return try {
            val response = call()
            Log.d("SmartSokoAdmin", "Response code: ${response.code()}")
            if (response.isSuccessful) {
                val body = response.body()
                Log.d("SmartSokoAdmin", "Success body: $body")
                @Suppress("UNCHECKED_CAST")
                Result.success(body as T)
            } else {
                val errorBody = response.errorBody()?.string() ?: "Unknown error"
                Log.e("SmartSokoAdmin", "API Error: ${response.code()} $errorBody")
                Result.failure(Exception("API Error: ${response.code()} $errorBody"))
            }
        } catch (e: Exception) {
            Log.e("SmartSokoAdmin", "Exception: ${e.message}", e)
            Result.failure(e)
        }
    }

    override suspend fun login(email: String, password: String): Result<LoginResponse> =
        safeApiCall { api.login(LoginRequest(email, password)) }

    override suspend fun getDashboard(): Result<DashboardStats> =
        safeApiCall { api.getDashboard() }

    override suspend fun getUsers(role: String?, status: String?): Result<List<UserDto>> =
        safeApiCall { api.getUsers(role, status) }

    override suspend fun getUser(id: String): Result<UserDto> =
        safeApiCall { api.getUser(id) }

    override suspend fun getUserStats(): Result<DashboardStats> =
        safeApiCall { api.getUserStats() }

    override suspend fun getUserActivity(id: String): Result<List<OrderEventDto>> =
        safeApiCall { api.getUserActivity(id) }

    override suspend fun getUserOrders(id: String): Result<List<OrderDto>> =
        safeApiCall { api.getUserOrders(id) }

    override suspend fun updateUser(id: String, data: Map<String, Any>): Result<Unit> =
        safeApiCall { api.updateUser(id, data) }

    override suspend fun suspendUser(id: String): Result<Unit> =
        safeApiCall { api.suspendUser(id) }

    override suspend fun activateUser(id: String): Result<Unit> =
        safeApiCall { api.activateUser(id) }

    override suspend fun deleteUser(id: String): Result<Unit> =
        safeApiCall { api.deleteUser(id) }

    override suspend fun createUser(data: Map<String, Any>): Result<UserDto> =
        safeApiCall { api.createUser(data) }

    override suspend fun notifyUser(id: String, title: String, body: String): Result<Unit> =
        safeApiCall { api.notifyUser(id, mapOf("title" to title, "body" to body)) }

    override suspend fun getOrders(status: String?): Result<List<OrderDto>> =
        safeApiCall { api.getOrders(status) }

    override suspend fun getOrder(id: String): Result<OrderDto> =
        safeApiCall { api.getOrder(id) }

    override suspend fun getOrderTimeline(id: String): Result<List<OrderEventDto>> =
        safeApiCall { api.getOrderTimeline(id) }

    override suspend fun addOrderNote(id: String, note: String): Result<Unit> =
        safeApiCall { api.addOrderNote(id, mapOf("note" to note)) }

    override suspend fun processRefund(id: String, amount: Double, reason: String): Result<Unit> =
        safeApiCall { api.processRefund(id, mapOf("amount" to amount, "reason" to reason)) }

    override suspend fun getProducts(category: String?): Result<List<ProductDto>> =
        safeApiCall { api.getProducts(category) }

    override suspend fun getProduct(id: String): Result<ProductDto> =
        safeApiCall { api.getProduct(id) }

    override suspend fun createProduct(data: Map<String, Any>): Result<ProductDto> =
        safeApiCall { api.createProduct(data) }

    override suspend fun updateProduct(id: String, data: Map<String, Any>): Result<Unit> =
        safeApiCall { api.updateProduct(id, data) }

    override suspend fun deleteProduct(id: String): Result<Unit> =
        safeApiCall { api.deleteProduct(id) }

    override suspend fun getInventoryAlerts(threshold: Int): Result<Map<String, Any>> =
        safeApiCall { api.getInventoryAlerts(threshold) }

    override suspend fun getCategories(): Result<List<Map<String, String>>> =
        safeApiCall { api.getCategories() }

    override suspend fun getTickets(status: String?): Result<List<TicketDto>> =
        safeApiCall { api.getTickets(status) }

    override suspend fun getSlaMetrics(): Result<SlaMetrics> =
        safeApiCall { api.getSlaMetrics() }

    override suspend fun createTicket(data: Map<String, String>): Result<TicketDto> =
        safeApiCall { api.createTicket(data) }

    override suspend fun respondToTicket(id: String, response: String): Result<Unit> =
        safeApiCall { api.respondToTicket(id, mapOf("response" to response)) }

    override suspend fun assignTicket(id: String, assignedTo: String): Result<Unit> =
        safeApiCall { api.assignTicket(id, mapOf("assignedTo" to assignedTo)) }

    override suspend fun getCommissionRules(): Result<List<CommissionRuleDto>> =
        safeApiCall { api.getCommissionRules() }

    override suspend fun createCommissionRule(data: Map<String, Any>): Result<CommissionRuleDto> =
        safeApiCall { api.createCommissionRule(data) }

    override suspend fun getPayouts(): Result<List<PayoutDto>> =
        safeApiCall { api.getPayouts() }

    override suspend fun createPayout(data: Map<String, Any>): Result<PayoutDto> =
        safeApiCall { api.createPayout(data) }

    override suspend fun getRevenueReport(): Result<RevenueReport> =
        safeApiCall { api.getRevenueReport() }

    override suspend fun getTopSellers(): Result<List<TopSellerDto>> =
        safeApiCall { api.getTopSellers() }

    override suspend fun getSellerAnalytics(): Result<Map<String, Any>> =
        safeApiCall { api.getSellerAnalytics() }
}
