package com.fooddelivery.driver.data.model

import androidx.room.Entity
import androidx.room.PrimaryKey
import com.fooddelivery.driver.data.OrderEntityConverters
import com.fooddelivery.driver.network.Order as NetworkOrder
import org.json.JSONArray
import org.json.JSONObject

/**
 * Room entity for storing orders locally (for offline viewing and sync).
 */
@Entity(tableName = "orders")
data class OrderEntity(
    @PrimaryKey val id: String,
    val restaurantName: String,
    val restaurantAddress: String,
    val restaurantLat: Double,
    val restaurantLng: Double,
    val customerName: String?,
    val customerAddress: String,
    val customerLat: Double,
    val customerLng: Double,
    val items: String, // JSON string of List<OrderItem>
    val totalAmount: Double,
    val status: String,
    val createdAt: String,
    val updatedAt: String,
    val deliveryInstructions: String? = null,
    val isSynced: Boolean = false // Flag to indicate if this order has been synced with the server
) {
    fun toOrder(): NetworkOrder {
        val itemsList = mutableListOf<OrderItem>()
        try {
            val jsonArray = JSONArray(items)
            for (i in 0 until jsonArray.length()) {
                val itemObj = jsonArray.getJSONObject(i)
                itemsList.add(OrderItem(
                    name = itemObj.optString("name", ""),
                    quantity = itemObj.optInt("quantity", 1),
                    price = itemObj.optDouble("price", 0.0),
                    notes = itemObj.optString("specialInstructions", null)
                ))
            }
        } catch (_: Exception) { }
        
        return NetworkOrder(
            id = id,
            restaurantName = restaurantName,
            restaurantAddress = restaurantAddress,
            restaurantLat = restaurantLat,
            restaurantLng = restaurantLng,
            customerName = customerName,
            customerAddress = customerAddress,
            customerLat = customerLat,
            customerLng = customerLng,
            items = itemsList,
            totalAmount = totalAmount,
            status = status,
            createdAt = createdAt,
            updatedAt = updatedAt,
            deliveryInstructions = deliveryInstructions
        )
    }

    companion object {
        fun from(order: NetworkOrder, isSynced: Boolean = true): OrderEntity {
            val itemsJson = JSONArray().apply {
                order.items.forEach { item ->
                    put(JSONObject().apply {
                        put("name", item.name)
                        put("quantity", item.quantity)
                        put("price", item.price)
                        put("specialInstructions", item.notes)
                    })
                }
            }.toString()
            return OrderEntity(
                id = order.id,
                restaurantName = order.restaurantName,
                restaurantAddress = order.restaurantAddress,
                restaurantLat = order.restaurantLat ?: 0.0,
                restaurantLng = order.restaurantLng ?: 0.0,
                customerName = order.customerName,
                customerAddress = order.customerAddress,
                customerLat = order.customerLat,
                customerLng = order.customerLng,
                items = itemsJson,
                totalAmount = order.totalAmount,
                status = order.status,
                createdAt = order.createdAt,
                updatedAt = order.updatedAt,
                deliveryInstructions = order.deliveryInstructions,
                isSynced = isSynced
            )
        }
    }
}