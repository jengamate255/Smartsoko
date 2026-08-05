package com.smartsoko.customer.data.remote.api

import com.smartsoko.customer.data.remote.dto.*
import retrofit2.Response
import retrofit2.http.*

interface SmartsokoApiService {
    
    // Auth endpoints
    @POST("auth/login")
    suspend fun login(@Body request: LoginRequestDto): Response<ApiResponse<AuthResponseDto>>

    @POST("auth/refresh")
    suspend fun refreshToken(@Body request: RefreshTokenRequestDto): Response<ApiResponse<RefreshTokenResponseDto>>
    
    // Product endpoints
    @GET("products")
    suspend fun getProducts(
        @Query("page") page: Int = 1,
        @Query("per_page") perPage: Int = 20,
        @Query("category_id") categoryId: String? = null,
        @Query("search") search: String? = null
    ): Response<ApiResponse<PaginatedResponse<ProductDto>>>
    
    @GET("products/{product_id}")
    suspend fun getProductById(@Path("product_id") productId: String): Response<ApiResponse<ProductDto>>
    
    @GET("products/featured")
    suspend fun getFeaturedProducts(
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<List<ProductDto>>>
    
    @GET("categories")
    suspend fun getCategories(): Response<ApiResponse<List<CategoryDto>>>
    
    // Cart endpoints
    @GET("cart")
    suspend fun getCart(): Response<ApiResponse<CartDto>>
    
    @POST("cart/items")
    suspend fun addToCart(@Body request: AddToCartRequestDto): Response<ApiResponse<CartDto>>
    
    @PUT("cart/items")
    suspend fun updateCartItem(@Body request: UpdateCartItemRequestDto): Response<ApiResponse<CartDto>>
    
    @DELETE("cart/items/{cart_item_id}")
    suspend fun removeCartItem(@Path("cart_item_id") cartItemId: String): Response<ApiResponse<CartDto>>
    
    @DELETE("cart")
    suspend fun clearCart(): Response<ApiResponse<Unit>>
    
    // Order endpoints
    @POST("orders")
    suspend fun createOrder(@Body request: CreateOrderRequestDto): Response<ApiResponse<OrderDto>>
    
    @GET("orders")
    suspend fun getOrders(
        @Query("page") page: Int = 1,
        @Query("per_page") perPage: Int = 20,
        @Query("status") status: String? = null
    ): Response<ApiResponse<PaginatedResponse<OrderDto>>>
    
    @GET("orders/{order_id}")
    suspend fun getOrderById(@Path("order_id") orderId: String): Response<ApiResponse<OrderDto>>
    
    @GET("orders/{order_id}/tracking")
    suspend fun getOrderTracking(@Path("order_id") orderId: String): Response<ApiResponse<OrderTrackingDto>>
    
    @POST("orders/{order_id}/cancel")
    suspend fun cancelOrder(@Path("order_id") orderId: String): Response<ApiResponse<Unit>>
    
    // Address endpoints
    @GET("addresses")
    suspend fun getAddresses(): Response<ApiResponse<List<AddressDto>>>
    
    @POST("addresses")
    suspend fun createAddress(@Body request: CreateAddressRequestDto): Response<ApiResponse<AddressDto>>
    
    @PUT("addresses/{address_id}")
    suspend fun updateAddress(
        @Path("address_id") addressId: String,
        @Body request: UpdateAddressRequestDto
    ): Response<ApiResponse<AddressDto>>
    
    @DELETE("addresses/{address_id}")
    suspend fun deleteAddress(@Path("address_id") addressId: String): Response<ApiResponse<Unit>>
    
    @POST("addresses/{address_id}/set-default")
    suspend fun setDefaultAddress(@Path("address_id") addressId: String): Response<ApiResponse<Unit>>
    
    // Payment method endpoints
    @GET("payment-methods")
    suspend fun getPaymentMethods(): Response<ApiResponse<List<PaymentMethodDto>>>
    
    @POST("payment-methods")
    suspend fun addPaymentMethod(@Body request: AddPaymentMethodRequestDto): Response<ApiResponse<PaymentMethodDto>>
    
    @DELETE("payment-methods/{payment_method_id}")
    suspend fun deletePaymentMethod(@Path("payment_method_id") paymentMethodId: String): Response<ApiResponse<Unit>>
    
    @POST("payment-methods/{payment_method_id}/set-default")
    suspend fun setDefaultPaymentMethod(@Path("payment_method_id") paymentMethodId: String): Response<ApiResponse<Unit>>
    
    // User profile endpoints
    @GET("users/profile")
    suspend fun getUserProfile(): Response<ApiResponse<UserDto>>
    
    @PUT("users/profile")
    suspend fun updateUserProfile(@Body request: UpdateUserProfileRequestDto): Response<ApiResponse<UserDto>>
}

data class LoginRequestDto(
    val email: String,
    val password: String
)

data class CreateOrderRequestDto(
    val addressId: String,
    val paymentMethodId: String? = null,
    val notes: String? = null
)

data class CreateAddressRequestDto(
    val title: String,
    val fullName: String,
    val phoneNumber: String,
    val streetAddress: String,
    val apartment: String? = null,
    val city: String,
    val postalCode: String? = null,
    val latitude: Double,
    val longitude: Double,
    val address: String? = null,
    val deliveryInstructions: String? = null
)

data class UpdateAddressRequestDto(
    val title: String? = null,
    val fullName: String? = null,
    val phoneNumber: String? = null,
    val streetAddress: String? = null,
    val apartment: String? = null,
    val city: String? = null,
    val postalCode: String? = null,
    val latitude: Double? = null,
    val longitude: Double? = null,
    val address: String? = null,
    val deliveryInstructions: String? = null
)

data class AddPaymentMethodRequestDto(
    val type: String,
    val displayName: String,
    val lastFourDigits: String? = null,
    val provider: String? = null
)

data class UpdateUserProfileRequestDto(
    val name: String? = null,
    val email: String? = null,
    val imageUrl: String? = null
)

data class RefreshTokenRequestDto(
    val refresh_token: String
)

data class RefreshTokenResponseDto(
    val access_token: String,
    val refresh_token: String,
    val expires_in: Long
)
