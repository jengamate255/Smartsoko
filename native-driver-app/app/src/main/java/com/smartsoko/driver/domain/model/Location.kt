package com.smartsoko.driver.domain.model

data class Location(
    val lat: Double,
    val lng: Double,
    val bearing: Float = 0f,
    val speed: Float = 0f,
    val accuracy: Float = 0f,
    val timestamp: Long = System.currentTimeMillis()
)
