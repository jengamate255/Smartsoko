package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.smartsoko.customer.data.local.converter.DateConverter
import kotlinx.serialization.Serializable
import java.util.Date

@Entity(tableName = "auth")
@Serializable
data class AuthEntity(
    @PrimaryKey
    val id: String, // "auth_token" or similar
    val userId: String,
    val accessToken: String,
    val refreshToken: String,
    val tokenType: String,
    val expiresAt: Long, // timestamp
    val scope: String?,
    val isValid: Boolean,
    @TypeConverters(DateConverter::class)
    val createdAt: Date,
    @TypeConverters(DateConverter::class)
    val updatedAt: Date,
    @TypeConverters(DateConverter::class)
    val cachedAt: Date = Date()
)