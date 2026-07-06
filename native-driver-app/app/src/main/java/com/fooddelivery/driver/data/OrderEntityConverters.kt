package com.fooddelivery.driver.data

import androidx.room.TypeConverter
import org.json.JSONArray
import org.json.JSONObject

class OrderEntityConverters {

    @TypeConverter
    fun fromString(value: String): List<String> {
        val list = mutableListOf<String>()
        try {
            val jsonArray = JSONArray(value)
            for (i in 0 until jsonArray.length()) {
                list.add(jsonArray.getString(i))
            }
        } catch (_: Exception) { }
        return list
    }

    @TypeConverter
    fun fromList(list: List<String>): String {
        return JSONArray(list).toString()
    }
}
