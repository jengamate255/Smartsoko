package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.smartsoko.customer.data.local.converter.DateConverter
import kotlinx.serialization.Serializable
import java.util.Date

@Entity(tableName = "payment_methods")
@Serializable
data class PaymentMethodEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val type: String, // "card", "mobile_money", "cash_on_delivery"
    val provider: String, // "visa", "mastercard", "mpesa", "airtel_money", etc.
    val isDefault: Boolean,
    val lastUsedAt: Date?,
    // Card details (masked)
    val cardLast4: String?,
    val cardBrand: String?,
    val cardExpiryMonth: Int?,
    val cardExpiryYear: Int?,
    val cardHolderName: String?,
    // Mobile money details
    val phoneNumber: String?,
    val accountName: String?,
    // Common
    val nickname: String?,
    val metadata: Map<String, String>,
    @TypeConverters(DateConverter::class)
    val createdAt: Date,
    @TypeConverters(DateConverter::class)
    val updatedAt: Date,
    @TypeConverters(DateConverter::class)
    val cachedAt: Date = Date()
) {
    val displayName: String
        get() = when (type) {
            "card" -> "${cardBrand?.uppercase() ?: "Card"} ending in ${cardLast4 ?: "****"}"
            "mobile_money" -> "$provider - ${phoneNumber ?: accountName ?: "Mobile Money"}"
            "cash_on_delivery" -> "Cash on Delivery"
            else -> nickname ?: type
        }
    
    val isCard: Boolean
        get() = type == "card"
    
    val isMobileMoney: Boolean
        get() = type == "mobile_money"
    
    val isCashOnDelivery: Boolean
        get() = type == "cash_on_delivery"
}