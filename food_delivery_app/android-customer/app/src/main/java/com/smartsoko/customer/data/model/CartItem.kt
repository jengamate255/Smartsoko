package com.smartsoko.customer.data.model

data class CartItem(
    val productId: String = "",
    val name: String = "",
    val price: Double = 0.0,
    val quantity: Int = 1,
    val imageUrl: String = "",
    val merchantId: String = "",
    val merchantName: String = ""
) {
    val formattedPrice: String
        get() = "tsh %.2f".format(price)

    val lineTotal: Double
        get() = price * quantity
}
