package com.smartsoko.customer.data.remote.dto

import com.google.gson.annotations.SerializedName

data class OrderDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("user_id")
    val userId: String,
    
    @SerializedName("items")
    val items: List<OrderItemDto>,
    
    @SerializedName("status")
    val status: String,
    
    @SerializedName("delivery_address")
    val deliveryAddress: AddressDto,
    
    @SerializedName("payment_method")
    val paymentMethod: PaymentMethodDto,
    
    @SerializedName("subtotal")
    val subtotal: Double,
    
    @SerializedName("delivery_fee")
    val deliveryFee: Double,
    
    @SerializedName("total")
    val total: Double,
    
    @SerializedName("currency")
    val currency: String = "TSh",
    
    @SerializedName("created_at")
    val createdAt: Long,
    
    @SerializedName("updated_at")
    val updatedAt: Long,
    
    @SerializedName("estimated_delivery_time")
    val estimatedDeliveryTime: Long? = null,
    
    @SerializedName("driver")
    val driver: DriverDto? = null,
    
    @SerializedName("tracking")
    val tracking: OrderTrackingDto? = null
)

data class OrderItemDto(
    @SerializedName("product_id")
    val productId: String,
    
    @SerializedName("product_name")
    val productName: String,
    
    @SerializedName("product_image")
    val productImage: String,
    
    @SerializedName("quantity")
    val quantity: Int,
    
    @SerializedName("price")
    val price: Double,
    
    @SerializedName("seller_id")
    val sellerId: String,
    
    @SerializedName("seller_name")
    val sellerName: String
)

data class OrderTrackingDto(
    @SerializedName("driver_location")
    val driverLocation: LocationDto,
    
    @SerializedName("destination")
    val destination: LocationDto,
    
    @SerializedName("route")
    val route: List<LocationDto>,
    
    @SerializedName("eta")
    val eta: Long,
    
    @SerializedName("distance_remaining")
    val distanceRemaining: Double,
    
    @SerializedName("last_updated")
    val lastUpdated: Long
)

data class AddressDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("user_id")
    val userId: String,
    
    @SerializedName("title")
    val title: String,
    
    @SerializedName("full_name")
    val fullName: String,
    
    @SerializedName("phone_number")
    val phoneNumber: String,
    
    @SerializedName("street_address")
    val streetAddress: String,
    
    @SerializedName("apartment")
    val apartment: String? = null,
    
    @SerializedName("city")
    val city: String,
    
    @SerializedName("postal_code")
    val postalCode: String? = null,
    
    @SerializedName("location")
    val location: LocationDto,
    
    @SerializedName("is_default")
    val isDefault: Boolean = false,
    
    @SerializedName("delivery_instructions")
    val deliveryInstructions: String? = null
)

data class LocationDto(
    @SerializedName("latitude")
    val latitude: Double,
    
    @SerializedName("longitude")
    val longitude: Double,
    
    @SerializedName("address")
    val address: String? = null,
    
    @SerializedName("timestamp")
    val timestamp: Long = System.currentTimeMillis()
)

data class PaymentMethodDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("type")
    val type: String,
    
    @SerializedName("display_name")
    val displayName: String,
    
    @SerializedName("is_default")
    val isDefault: Boolean = false,
    
    @SerializedName("last_four_digits")
    val lastFourDigits: String? = null,
    
    @SerializedName("provider")
    val provider: String? = null
)

data class DriverDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("name")
    val name: String,
    
    @SerializedName("phone_number")
    val phoneNumber: String,
    
    @SerializedName("vehicle_number")
    val vehicleNumber: String,
    
    @SerializedName("vehicle_type")
    val vehicleType: String,
    
    @SerializedName("rating")
    val rating: Double = 0.0,
    
    @SerializedName("image_url")
    val imageUrl: String? = null,
    
    @SerializedName("current_location")
    val currentLocation: LocationDto? = null
)
