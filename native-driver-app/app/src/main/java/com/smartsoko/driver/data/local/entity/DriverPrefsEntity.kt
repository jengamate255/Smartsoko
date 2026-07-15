package com.smartsoko.driver.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "driver_prefs")
data class DriverPrefsEntity(
    @PrimaryKey val id: Int = 1,
    val isOnline: Boolean = false,
    val activeOrderId: String? = null,
    val lastKnownLat: Double = 0.0,
    val lastKnownLng: Double = 0.0,
    val lastKnownBearing: Float = 0f
)
