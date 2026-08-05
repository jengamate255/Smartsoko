package com.smartsoko.admin.data.remote

import com.smartsoko.admin.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface AdminApiService {

    // Auth
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<LoginResponse>>

    // Dashboard
    @GET("admin/dashboard")
    suspend fun getDashboard(): Response<ApiResponse<DashboardStats>>

    // Users
    @GET("admin/users")
    suspend fun getUsers(
        @Query("role") role: String? = null,
        @Query("status") status: String? = null
    ): Response<ApiListResponse<UserDto>>

    @GET("admin/users/{id}")
    suspend fun getUser(@Path("id") id: String): Response<ApiResponse<UserDto>>

    @GET("admin/users/stats")
    suspend fun getUserStats(): Response<ApiResponse<DashboardStats>>

    @GET("admin/users/{id}/activity")
    suspend fun getUserActivity(@Path("id") id: String): Response<ApiResponse<List<OrderEventDto>>>

    @GET("admin/users/{id}/orders")
    suspend fun getUserOrders(@Path("id") id: String): Response<ApiResponse<List<OrderDto>>>

    @PUT("admin/users/{id}")
    suspend fun updateUser(@Path("id") id: String, @Body body: Map<String, Any>): Response<ApiResponse<Unit>>

    @POST("admin/users/{id}/suspend")
    suspend fun suspendUser(@Path("id") id: String): Response<ApiResponse<Unit>>

    @POST("admin/users/{id}/activate")
    suspend fun activateUser(@Path("id") id: String): Response<ApiResponse<Unit>>

    @DELETE("admin/users/{id}")
    suspend fun deleteUser(@Path("id") id: String): Response<ApiResponse<Unit>>

    @POST("admin/users")
    suspend fun createUser(@Body body: Map<String, Any>): Response<ApiResponse<UserDto>>

    @POST("admin/users/{id}/notify")
    suspend fun notifyUser(@Path("id") id: String, @Body body: Map<String, String>): Response<ApiResponse<Unit>>

    // Orders
    @GET("admin/orders")
    suspend fun getOrders(
        @Query("status") status: String? = null,
        @Query("page") page: Int? = null,
        @Query("limit") limit: Int? = null
    ): Response<ApiListResponse<OrderDto>>

    @GET("admin/orders/{id}")
    suspend fun getOrder(@Path("id") id: String): Response<ApiResponse<OrderDto>>

    @GET("admin/orders/{id}/timeline")
    suspend fun getOrderTimeline(@Path("id") id: String): Response<ApiResponse<List<OrderEventDto>>>

    @POST("admin/orders/{id}/note")
    suspend fun addOrderNote(@Path("id") id: String, @Body body: Map<String, String>): Response<ApiResponse<Unit>>

    @POST("admin/orders/{id}/refund")
    suspend fun processRefund(@Path("id") id: String, @Body body: Map<String, Any>): Response<ApiResponse<Unit>>

    // Products
    @GET("admin/products")
    suspend fun getProducts(
        @Query("category") category: String? = null,
        @Query("limit") limit: Int? = null
    ): Response<ApiListResponse<ProductDto>>

    @GET("admin/products/{id}")
    suspend fun getProduct(@Path("id") id: String): Response<ApiResponse<ProductDto>>

    @POST("admin/products")
    suspend fun createProduct(@Body body: Map<String, Any>): Response<ApiResponse<ProductDto>>

    @PUT("admin/products/{id}")
    suspend fun updateProduct(@Path("id") id: String, @Body body: Map<String, Any>): Response<ApiResponse<Unit>>

    @DELETE("admin/products/{id}")
    suspend fun deleteProduct(@Path("id") id: String): Response<ApiResponse<Unit>>

    @GET("admin/inventory/alerts")
    suspend fun getInventoryAlerts(@Query("threshold") threshold: Int = 10): Response<ApiResponse<Map<String, Any>>>

    // Categories
    @GET("admin/categories")
    suspend fun getCategories(): Response<ApiResponse<List<Map<String, String>>>>

    // Tickets
    @GET("admin/tickets")
    suspend fun getTickets(
        @Query("status") status: String? = null,
        @Query("priority") priority: String? = null
    ): Response<ApiListResponse<TicketDto>>

    @GET("admin/tickets/sla")
    suspend fun getSlaMetrics(): Response<ApiResponse<SlaMetrics>>

    @POST("admin/tickets")
    suspend fun createTicket(@Body body: Map<String, String>): Response<ApiResponse<TicketDto>>

    @POST("admin/tickets/{id}/respond")
    suspend fun respondToTicket(@Path("id") id: String, @Body body: Map<String, String>): Response<ApiResponse<Unit>>

    @POST("admin/tickets/{id}/assign")
    suspend fun assignTicket(@Path("id") id: String, @Body body: Map<String, String>): Response<ApiResponse<Unit>>

    // Commission
    @GET("admin/commission/rules")
    suspend fun getCommissionRules(): Response<ApiResponse<List<CommissionRuleDto>>>

    @POST("admin/commission/rules")
    suspend fun createCommissionRule(@Body body: Map<String, Any>): Response<ApiResponse<CommissionRuleDto>>

    // Payouts
    @GET("admin/payouts")
    suspend fun getPayouts(): Response<ApiResponse<List<PayoutDto>>>

    @POST("admin/payouts")
    suspend fun createPayout(@Body body: Map<String, Any>): Response<ApiResponse<PayoutDto>>

    // Analytics
    @GET("admin/analytics/revenue")
    suspend fun getRevenueReport(): Response<ApiResponse<RevenueReport>>

    @GET("admin/analytics/top-sellers")
    suspend fun getTopSellers(@Query("limit") limit: Int = 10): Response<ApiResponse<List<TopSellerDto>>>

    @GET("admin/sellers/analytics")
    suspend fun getSellerAnalytics(): Response<ApiResponse<Map<String, Any>>>
}
