package com.smartsoko.customer.domain.model

data class User(
    val id: String,
    val phoneNumber: String,
    val name: String? = null,
    val email: String? = null,
    val imageUrl: String? = null,
    val isVerified: Boolean = false,
    val createdAt: Long,
    val updatedAt: Long
)

data class UserProfile(
    val user: User,
    val addresses: List<Address>,
    val savedPaymentMethods: List<PaymentMethod>,
    val defaultAddressId: String? = null
)
