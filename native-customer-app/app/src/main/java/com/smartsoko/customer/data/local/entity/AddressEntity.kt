package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.smartsoko.customer.data.local.converter.DateConverter
import kotlinx.serialization.Serializable
import java.util.Date

@Entity(tableName = "addresses")
@Serializable
data class AddressEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val label: String, // "Home", "Work", "Other"
    val fullName: String,
    val phoneNumber: String,
    val addressLine1: String,
    val addressLine2: String?,
    val city: String,
    val state: String,
    val postalCode: String?,
    val country: String,
    val latitude: Double,
    val longitude: Double,
    val landmark: String?,
    val isDefault: Boolean,
    val instructions: String?,
    @TypeConverters(DateConverter::class)
    val createdAt: Date,
    @TypeConverters(DateConverter::class)
    val updatedAt: Date,
    @TypeConverters(DateConverter::class)
    val cachedAt: Date = Date()
) {
    val fullAddress: String
        get() = buildString {
            append(addressLine1)
            addressLine2?.let { append(", $it") }
            append(", $city")
            if (!state.isNullOrBlank()) append(", $state")
            postalCode?.let { append(" $it") }
            append(", $country")
        }
    
    val shortAddress: String
        get() = "$addressLine1, $city"
}