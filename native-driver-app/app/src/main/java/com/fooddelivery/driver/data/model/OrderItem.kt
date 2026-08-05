package com.fooddelivery.driver.data.model

data class OrderItem(
    val name: String,
    val quantity: Int,
    val price: Double,
    val notes: String? = null
)