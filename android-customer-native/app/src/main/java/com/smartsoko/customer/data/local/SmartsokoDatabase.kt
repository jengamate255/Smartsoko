package com.smartsoko.customer.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.smartsoko.customer.data.local.converter.Converters
import com.smartsoko.customer.data.local.entity.*

@Database(
    entities = [
        ProductEntity::class,
        OrderEntity::class,
        CartEntity::class,
        UserEntity::class,
        AddressEntity::class
    ],
    version = 1,
    exportSchema = false
)
@TypeConverters(Converters::class)
abstract class SmartsokoDatabase : RoomDatabase() {
    
    abstract fun productDao(): com.smartsoko.customer.data.local.dao.ProductDao
    abstract fun orderDao(): com.smartsoko.customer.data.local.dao.OrderDao
    abstract fun cartDao(): com.smartsoko.customer.data.local.dao.CartDao
    abstract fun userDao(): com.smartsoko.customer.data.local.dao.UserDao
    abstract fun addressDao(): com.smartsoko.customer.data.local.dao.AddressDao
}
