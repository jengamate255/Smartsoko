package com.fooddelivery.driver.data

import androidx.room.TypeConverter
import com.fooddelivery.driver.data.model.OrderItem
import org.json.JSONArray
import org.json.JSONObject

class OrderEntityConverters {
    @TypeConverter
    fun fromJsonArray(json: String?): List<OrderItem> {
        val list = mutableListOf<OrderItem>()
        if (json.isNullOrEmpty()) return list
        try {
            val jsonArray = JSONArray(json)
            for (i in 0 until jsonArray.length()) {
                val itemObj = jsonArray.getJSONObject(i)
                list.add(OrderItem(
                    name = itemObj.optString("name", ""),
                    quantity = itemObj.optInt("quantity", 1),
                    price = itemObj.optDouble("price", 0.0),
                    notes = itemObj.optString("specialInstructions", null)
                ))
            }
        } catch (_: Exception) { }
        return list
    }

    @TypeConverter
    fun toJsonArray(list: List<OrderItem>?): String {
        val jsonArray = JSONArray()
        list?.forEach { item ->
            jsonArray.put(JSONObject().apply {
                put("name", item.name)
                put("quantity", item.quantity)
                put("price", item.price)
                put("specialInstructions", item.notes)
            })
        }
        return jsonArray.toString()
    }
}