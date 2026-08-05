package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "users")
data class UserEntity(
    @PrimaryKey
    val id: String,
    val phoneNumber: String,
    val name: String?,
    val email: String?,
    val imageUrl: String?,
    val isVerified: Boolean,
    val createdAt: Long,
    val updatedAt: Long
)
