package com.fooddelivery.driver.data

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "driver_prefs")
data class DriverPrefsEntity(
    @PrimaryKey var id: Int = 1,
    var isOnline: Boolean = false,
    var lastKnownLat: Double = 0.0,
    var lastKnownLng: Double = 0.0
)
