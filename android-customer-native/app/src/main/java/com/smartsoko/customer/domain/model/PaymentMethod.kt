package com.smartsoko.customer.domain.model

data class PaymentMethod(
    val id: String,
    val type: PaymentType,
    val displayName: String,
    val isDefault: Boolean = false,
    val lastFourDigits: String? = null,
    val provider: String? = null
)

enum class PaymentType {
    CASH_ON_DELIVERY,
    MPESA,
    CARD,
    BANK_TRANSFER,
    PAYPAL
}

data class PaymentPreference(
    val method: PaymentMethod,
    val lastUsedAt: Long = System.currentTimeMillis()
)
