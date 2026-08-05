package com.smartsoko.driver.data.remote

import com.smartsoko.driver.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @POST("auth/otp/send")
    suspend fun sendOtp(@Body request: OtpRequestDto): Response<ApiResponse<Any>>

    @POST("auth/otp/verify")
    suspend fun verifyOtp(@Body request: OtpVerifyDto): Response<ApiResponse<AuthResponseDto>>

    @POST("auth/profile")
    suspend fun completeProfile(
        @Header("Authorization") token: String,
        @Body profile: DriverProfileDto
    ): Response<ApiResponse<AuthResponseDto>>

    @GET("driver/profile")
    suspend fun getProfile(
        @Header("Authorization") token: String
    ): Response<ApiResponse<AuthResponseDto>>

    @GET("orders/available")
    suspend fun getAvailableOrders(
        @Header("Authorization") token: String
    ): Response<ApiResponse<List<OrderDto>>>

    @POST("orders/accept")
    suspend fun acceptOrder(
        @Header("Authorization") token: String,
        @Body body: AcceptRejectDto
    ): Response<ApiResponse<OrderDto>>

    @POST("orders/reject")
    suspend fun rejectOrder(
        @Header("Authorization") token: String,
        @Body body: AcceptRejectDto
    ): Response<ApiResponse<Any>>

    @POST("orders/status")
    suspend fun updateOrderStatus(
        @Header("Authorization") token: String,
        @Body body: OrderStatusUpdateDto
    ): Response<ApiResponse<OrderDto>>

    @GET("orders/history")
    suspend fun getOrderHistory(
        @Header("Authorization") token: String,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<List<OrderDto>>>

    @GET("driver/earnings")
    suspend fun getEarnings(
        @Header("Authorization") token: String
    ): Response<ApiResponse<EarningsDto>>
}

data class EarningsDto(
    val today_amount: Double,
    val today_deliveries: Int,
    val weekly_amount: Double,
    val weekly_deliveries: Int,
    val daily_breakdown: List<DailyEarningDto>
)

data class DailyEarningDto(
    val date: String,
    val amount: Double,
    val deliveries: Int
)
