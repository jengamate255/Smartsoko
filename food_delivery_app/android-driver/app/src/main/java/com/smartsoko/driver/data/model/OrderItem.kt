package com.smartsoko.driver.data.model

data class OrderItem(
    val productId: String = "",
    val name: String = "",
    val quantity: Int = 1,
    val price: Double = 0.0,
    val imageUrl: String = ""
)
