package com.fooddelivery.driver.network

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.Header
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * API service for communicating with our backend (Node.js/Express server).
 * This communicates with the server at https://your-backend-url.com
 */
interface ApiService {

    @GET("api/driver/profile")
    suspend fun getDriverProfile(
        @Header("Authorization") authToken: String
    ): Response<DriverProfileResponse>

    @GET("api/orders/available")
    suspend fun getAvailableOrders(
        @Header("Authorization") authToken: String,
        @Query("limit") limit: Int = 10,
        @Query("offset") offset: Int = 0
    ): Response<AvailableOrdersResponse>

    @POST("api/orders/{orderId}/accept")
    suspend fun acceptOrder(
        @Header("Authorization") authToken: String,
        @Path("orderId") orderId: String
    ): Response<OrderActionResponse>

    @POST("api/orders/{orderId}/status")
    suspend fun updateOrderStatus(
        @Header("Authorization") authToken: String,
        @Path("orderId") orderId: String,
        @Body statusUpdate: OrderStatusUpdate
    ): Response<OrderActionResponse>

    // Additional endpoints as needed
    @GET("api/orders/{orderId}")
    suspend fun getOrderDetails(
        @Header("Authorization") authToken: String,
        @Path("orderId") orderId: String
    ): Response<OrderDetailsResponse>

    // For syncing local changes (if needed)
    @POST("api/orders/sync")
    suspend fun syncOrders(
        @Header("Authorization") authToken: String,
        @Body syncRequest: SyncRequest
    ): Response<SyncResponse>
}

data class DriverProfileResponse(
    val success: Boolean,
    val driver: DriverData
)

data class DriverData(
    val id: String,
    val email: String,
    val fullName: String,
    val phone: String?,
    val vehicle: String?,
    val plate: String?,
    val rating: Double,
    val totalDeliveries: Int,
    val status: String
)

data class AvailableOrdersResponse(
    val success: Boolean,
    val orders: List<Order>
)

data class Order(
    val id: String,
    val restaurantName: String,
    val restaurantAddress: String,
    val restaurantLat: Double,
    val restaurantLng: Double,
    val customerName: String?,
    val customerAddress: String,
    val customerLat: Double,
    val customerLng: Double,
    val items: String, // JSON string of List<OrderItem>
    val totalAmount: Double,
    val status: String,
    val createdAt: String,
    val updatedAt: String,
    val deliveryInstructions: String? = null
)

data class OrderItem(
    val name: String,
    val quantity: Int,
    val price: Double,
    val specialInstructions: String?
)

data class OrderStatusUpdate(
    val status: String
)

data class OrderActionResponse(
    val success: Boolean,
    val message: String?,
    val order: Order?
)

data class OrderDetailsResponse(
    val success: Boolean,
    val order: Order
)

data class SyncRequest(
    val unsyncedOrders: List<OrderEntity>
)

data class SyncResponse(
    val success: Boolean,
    val syncedOrders: List<String>, // List of order IDs that were synced
    val errors: List<SyncError>?
)

data class SyncError(
    val orderId: String,
    val error: String
)

// We'll keep the OrderEntity from before for Room