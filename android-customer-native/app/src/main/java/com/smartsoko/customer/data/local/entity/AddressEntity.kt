package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "addresses")
data class AddressEntity(
    @PrimaryKey
    val id: String,
    val userId: String,
    val title: String,
    val fullName: String,
    val phoneNumber: String,
    val streetAddress: String,
    val apartment: String?,
    val city: String,
    val postalCode: String?,
    val latitude: Double,
    val longitude: Double,
    val address: String?,
    val isDefault: Boolean,
    val deliveryInstructions: String?
)
