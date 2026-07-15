package com.smartsoko.customer.data.remote

import retrofit2.Call
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.PUT
import retrofit2.http.DELETE
import retrofit2.http.Path
import retrofit2.http.Query
import retrofit2.http.Body
import retrofit2.http.Header

// Generic API Response
interface ApiResponse<T> {
    val success: Boolean
    val message: String?
    val data: T?
    val error: String?
}

// Product API
interface ProductApiService {
    @GET("products")
    suspend fun getProducts(
        @Query("limit") limit: Int = 10,
        @Query("offset") offset: Int = 0,
        @Query("category") category: String? = null,
        @Query("minPrice") minPrice: Double? = null,
        @Query("maxPrice") maxPrice: Double? = null,
        @Query("rating") rating: Float? = null,
        @Query("inStock") inStock: Boolean? = null
    ): ApiResponse<List<ProductResponse>>

    @GET("products/{id}")
    suspend fun getProductById(@Path("id") id: String): ApiResponse<ProductResponse>

    @GET("products/search/{query}")
    suspend fun searchProducts(@Path("query") query: String): ApiResponse<List<ProductResponse>>

    @GET("categories")
    suspend fun getCategories(): ApiResponse<List<CategoryResponse>>

    @GET("categories/{id}")
    suspend fun getCategory(@Path("id") id: String): ApiResponse<CategoryResponse>
}

// Auth API
interface AuthApiService {
    @POST("auth/send-otp")
    suspend fun sendOtp(@Body request: SendOtpRequest): ApiResponse<String>

    @POST("auth/verify-otp")
    suspend fun verifyOtp(@Body request: VerifyOtpRequest): ApiResponse<AuthResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): ApiResponse<AuthResponse>

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): ApiResponse<AuthResponse>

    @POST("auth/logout")
    suspend fun logout(@Body request: LogoutRequest): ApiResponse<Boolean>

    @GET("auth/user")
    suspend fun getCurrentUser(@Header("Authorization") token: String): ApiResponse<UserResponse>
}

// Cart API
interface CartApiService {
    @GET("cart")
    suspend fun getCart(@Header("Authorization") token: String): ApiResponse<CartResponse>

    @POST("cart/items")
    suspend fun addToCart(@Header("Authorization") token: String, @Body request: AddToCartRequest): ApiResponse<CartItemResponse>

    @PUT("cart/items/{itemId}")
    suspend fun updateCartItem(
        @Header("Authorization") token: String,
        @Path("itemId") itemId: String,
        @Body request: UpdateCartItemRequest
    ): ApiResponse<CartItemResponse>

    @DELETE("cart/items/{itemId}")
    suspend fun removeFromCart(
        @Header("Authorization") token: String,
        @Path("itemId") itemId: String
    ): ApiResponse<Boolean>

    @DELETE("cart/clear")
    suspend fun clearCart(@Header("Authorization") token: String): ApiResponse<Boolean>
}

// Order API
interface OrderApiService {
    @POST("orders")
    suspend fun createOrder(
        @Header("Authorization") token: String,
        @Body request: CreateOrderRequest
    ): ApiResponse<OrderResponse>

    @GET("orders")
    suspend fun getOrders(
        @Header("Authorization") token: String,
        @Query("limit") limit: Int = 10,
        @Query("offset") offset: Int = 0
    ): ApiResponse<List<OrderResponse>>

    @GET("orders/{id}")
    suspend fun getOrder(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): ApiResponse<OrderResponse>

    @PUT("orders/{id}/status")
    suspend fun updateOrderStatus(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body request: UpdateOrderStatusRequest
    ): ApiResponse<OrderResponse>

    @POST("orders/{id}/cancel")
    suspend fun cancelOrder(
        @Header("Authorization") token: String,
        @Path("id") id: String
    ): ApiResponse<Boolean>

    @POST("orders/{id}/rate")
    suspend fun rateOrder(
        @Header("Authorization") token: String,
        @Path("id") id: String,
        @Body request: RateOrderRequest
    ): ApiResponse<Boolean>
}

// API Request/Response Models
// Request models
data class SendOtpRequest(val phoneNumber: String)
data class VerifyOtpRequest(val phoneNumber: String, val otpCode: String)
data class RegisterRequest(val phoneNumber: String, val fullName: String, val email: String?)
data class LoginRequest(val phoneNumber: String, val password: String?)
data class LogoutRequest(val userId: String)
data class AddToCartRequest(val productId: String, val quantity: Int = 1, val attributes: Map<String, String>?)
data class UpdateCartItemRequest(val quantity: Int, val attributes: Map<String, String>?)
data class CreateOrderRequest(
    val deliveryAddressId: String,
    val paymentMethodId: String,
    val deliveryInstructions: String?,
    val orderNotes: String?,
    val deliveryLatitude: Double,
    val deliveryLongitude: Double,
    val orderItems: List<OrderItemRequest>
)
data class OrderItemRequest(val productId: String, val quantity: Int, val attributes: Map<String, String>?)
data class UpdateOrderStatusRequest(val status: String, val note: String?)
data class RateOrderRequest(val rating: Int, val review: String?)

// Response models
data class ProductResponse(
    val id: String,
    val name: String,
    val description: String,
    val price: Double,
    val originalPrice: Double?,
    val currency: String,
    val images: List<String>,
    val categoryId: String,
    val categoryName: String,
    val sellerId: String,
    val sellerName: String,
    val sellerRating: Float,
    val stockQuantity: Int,
    val isAvailable: Boolean,
    val rating: Float,
    val reviewCount: Int,
    val tags: List<String>,
    val attributes: Map<String, String>,
    val createdAt: String
)

data class CategoryResponse(
    val id: String,
    val name: String,
    val description: String,
    val iconUrl: String?,
    val imageUrl: String?,
    val parentId: String?,
    val sortOrder: Int,
    val isActive: Boolean,
    val productCount: Int,
    val createdAt: String
)

data class UserResponse(
    val id: String,
    val phoneNumber: String,
    val email: String?,
    val firstName: String,
    val lastName: String,
    val profileImageUrl: String?,
    val isPhoneVerified: Boolean,
    val isEmailVerified: Boolean,
    val defaultAddressId: String?,
    val defaultPaymentMethodId: String?,
    val loyaltyPoints: Int,
    val referralCode: String,
    val createdAt: String
)

data class AuthResponse(
    val user: UserResponse,
    val accessToken: String,
    val refreshToken: String,
    val expiresIn: Int
)

data class CartItemResponse(
    val id: String,
    val productId: String,
    val productName: String,
    val productImage: String,
    val price: Double,
    val currency: String,
    val quantity: Int,
    val sellerId: String,
    val sellerName: String,
    val maxQuantity: Int,
    val isAvailable: Boolean,
    val attributes: Map<String, String>,
    val totalPrice: Double
)

data class CartResponse(
    val id: String,
    val userId: String,
    val items: List<CartItemResponse>,
    val subtotal: Double,
    val deliveryFee: Double,
    val serviceFee: Double,
    val total: Double,
    val createdAt: String,
    val updatedAt: String
)

data class OrderItemResponse(
    val productId: String,
    val productName: String,
    val productImage: String,
    val price: Double,
    val quantity: Int,
    val total: Double,
    val attributes: Map<String, String>
)

data class OrderResponse(
    val id: String,
    val userId: String,
    val status: String,
    val subtotal: Double,
    val deliveryFee: Double,
    val serviceFee: Double,
    val discount: Double,
    val total: Double,
    val currency: String,
    val paymentMethodId: String,
    val paymentMethodType: String,
    val paymentStatus: String,
    val deliveryAddress: String,
    val deliveryLatitude: Double,
    val deliveryLongitude: Double,
    val deliveryInstructions: String?,
    val pickupAddress: String?,
    val pickupLatitude: Double?,
    val pickupLongitude: Double?,
    val sellerId: String,
    val sellerName: String,
    val driverId: String?,
    val driverName: String?,
    val driverPhone: String?,
    val driverLatitude: Double?,
    val driverLongitude: Double?,
    val estimatedDeliveryTime: String?,
    val actualDeliveryTime: String?,
    val items: List<OrderItemResponse>,
    val createdAt: String,
    val updatedAt: String
)
