package com.smartsoko.customer.domain.model

enum class ProductCategory(val displayName: String) {
    FOOD("Food"),
    DAIRY("Dairy"),
    FRUITS("Fruits"),
    GROCERIES("Groceries"),
    BAKERY("Bakery"),
    OTHER("Other");

    companion object {
        fun fromString(value: String): ProductCategory =
            entries.find { it.name.equals(value, ignoreCase = true) } ?: OTHER
    }
}

data class Product(
    val id: String,
    val name: String,
    val description: String,
    val price: Double,
    val currency: String = "TSh",
    val images: List<String>,
    val category: Category,
    val seller: Seller,
    val stock: Int,
    val rating: Double = 0.0,
    val reviewCount: Int = 0,
    val isFeatured: Boolean = false,
    val createdAt: Long,
    val updatedAt: Long
) {
    val isInStock: Boolean get() = stock != 0
    val isUnlimitedStock: Boolean get() = stock < 0
    val stockLabel: String
        get() = when {
            stock < 0 -> "In stock (unlimited)"
            stock > 0 -> "Stock: $stock available"
            else -> "Out of stock"
        }
    fun canIncreaseQuantity(current: Int): Boolean =
        stock < 0 || current < stock
}

data class Category(
    val id: String,
    val name: String,
    val imageUrl: String,
    val description: String = ""
)

data class Seller(
    val id: String,
    val name: String,
    val rating: Double = 0.0,
    val deliveryTime: String = "",
    val imageUrl: String = ""
)

data class CategoryInfo(
    val id: String,
    val name: String,
    val displayName: String,
    val icon: String,
    val productCount: Int = 0
)
