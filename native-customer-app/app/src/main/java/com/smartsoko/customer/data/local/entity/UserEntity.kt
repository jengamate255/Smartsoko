package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.smartsoko.customer.data.local.converter.DateConverter
import kotlinx.serialization.Serializable
import java.util.Date

@Entity(tableName = "users")
@Serializable
data class UserEntity(
    @PrimaryKey
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
    val referredBy: String?,
    val fcmToken: String?,
    @TypeConverters(DateConverter::class)
    val lastLoginAt: Date?,
    @TypeConverters(DateConverter::class)
    val createdAt: Date,
    @TypeConverters(DateConverter::class)
    val updatedAt: Date,
    @TypeConverters(DateConverter::class)
    val cachedAt: Date = Date()
) {
    val fullName: String
        get() = "$firstName $lastName"
}