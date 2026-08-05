package com.smartsoko.customer.data.local.converter

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

class Converters {
    
    private val gson = Gson()
    
    @TypeConverter
    fun fromStringList(value: List<String>): String {
        return gson.toJson(value)
    }
    
    @TypeConverter
    fun toStringList(value: String): List<String> {
        val listType = object : TypeToken<List<String>>() {}.type
        return gson.fromJson(value, listType) ?: emptyList()
    }
    
    @TypeConverter
    fun fromJsonObject(value: Any): String {
        return gson.toJson(value)
    }
    
    @TypeConverter
    fun toJsonObject(value: String): Any {
        return gson.fromJson(value, Any::class.java)
    }
}
