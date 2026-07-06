package com.fooddelivery.driver.data.model

/**
 * User model for authentication
 */
data class User(
    val id: String,
    val email: String,
    val fullName: String,
    val role: String,
    val phone: String? = null,
    val isEmailVerified: Boolean = false,
    val createdAt: String? = null
)