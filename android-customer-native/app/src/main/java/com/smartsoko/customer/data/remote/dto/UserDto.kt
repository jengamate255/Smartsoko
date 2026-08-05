package com.smartsoko.customer.data.remote.dto

import com.google.gson.annotations.SerializedName

data class UserDto(
    @SerializedName("id")
    val id: String,
    
    @SerializedName("phone_number")
    val phoneNumber: String,
    
    @SerializedName("name")
    val name: String? = null,
    
    @SerializedName("email")
    val email: String? = null,
    
    @SerializedName("image_url")
    val imageUrl: String? = null,
    
    @SerializedName("is_verified")
    val isVerified: Boolean = false,
    
    @SerializedName("created_at")
    val createdAt: Long,
    
    @SerializedName("updated_at")
    val updatedAt: Long
)

data class AuthResponseDto(
    @SerializedName("user")
    val user: UserDto,
    
    @SerializedName("token")
    val token: String,
    
    @SerializedName("is_new_user")
    val isNewUser: Boolean = false
)


