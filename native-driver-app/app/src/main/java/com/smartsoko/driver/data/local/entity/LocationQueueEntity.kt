package com.smartsoko.driver.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "location_queue")
data class LocationQueueEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val lat: Double,
    val lng: Double,
    val bearing: Float,
    val speed: Float,
    val timestamp: Long,
    val isSent: Boolean = false
)
