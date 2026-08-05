package com.smartsoko.customer.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters
import com.smartsoko.customer.data.local.converter.DateConverter
import kotlinx.serialization.Serializable
import java.util.Date

@Entity(tableName = "categories")
@Serializable
data class CategoryEntity(
    @PrimaryKey
    val id: String,
    val name: String,
    val description: String,
    val iconUrl: String?,
    val imageUrl: String?,
    val parentId: String?,
    val sortOrder: Int,
    val isActive: Boolean,
    val productCount: Int,
    @TypeConverters(DateConverter::class)
    val createdAt: Date,
    @TypeConverters(DateConverter::class)
    val updatedAt: Date,
    @TypeConverters(DateConverter::class)
    val cachedAt: Date = Date()
)