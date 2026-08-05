package com.smartsoko.customer.data.local.converter

import androidx.room.TypeConverter
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import java.lang.reflect.Type
import java.util.Date
import java.util.*

class DateConverter {
    @TypeConverter
    fun fromTimestamp(value: Long?): Date? {
        return value?.let { Date(it) }
    }

    @TypeConverter
    fun dateToTimestamp(date: Date?): Long? {
        return date?.time
    }
}

class ListConverter {
    private val gson = Gson()
    
    @TypeConverter
    fun fromString(value: String?): List<String> {
        return value?.let {
            val type: Type = object : TypeToken<List<String>>() {}.type
            gson.fromJson(it, type)
        } ?: emptyList()
    }

    @TypeConverter
    fun toString(list: List<String>?): String? {
        return list?.let { gson.toJson(it) }
    }
}

class MapConverter {
    private val gson = Gson()
    
    @TypeConverter
    fun fromString(value: String?): Map<String, String> {
        return value?.let {
            val type: Type = object : TypeToken<Map<String, String>>() {}.type
            gson.fromJson(it, type)
        } ?: emptyMap()
    }

    @TypeConverter
    fun toString(map: Map<String, String>?): String? {
        return map?.let { gson.toJson(it) }
    }
}

class OrderItemConverter {
    private val gson = Gson()
    
    @TypeConverter
    fun fromString(value: String?): List<com.smartsoko.customer.data.local.entity.OrderItemEntity> {
        return value?.let {
            val type: Type = object : TypeToken<List<com.smartsoko.customer.data.local.entity.OrderItemEntity>>() {}.type
            gson.fromJson(it, type)
        } ?: emptyList()
    }

    @TypeConverter
    fun toString(list: List<com.smartsoko.customer.data.local.entity.OrderItemEntity>?): String? {
        return list?.let { gson.toJson(it) }
    }
}

class OrderStatusHistoryConverter {
    private val gson = Gson()
    
    @TypeConverter
    fun fromString(value: String?): List<com.smartsoko.customer.data.local.entity.OrderStatusHistoryEntity> {
        return value?.let {
            val type: Type = object : TypeToken<List<com.smartsoko.customer.data.local.entity.OrderStatusHistoryEntity>>() {}.type
            gson.fromJson(it, type)
        } ?: emptyList()
    }

    @TypeConverter
    fun toString(list: List<com.smartsoko.customer.data.local.entity.OrderStatusHistoryEntity>?): String? {
        return list?.let { gson.toJson(it) }
    }
}