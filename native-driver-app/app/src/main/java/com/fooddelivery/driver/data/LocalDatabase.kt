package com.fooddelivery.driver.data

import androidx.room.Database
import androidx.room.RoomDatabase
import androidx.room.TypeConverters

@Database(entities = [OrderEntity::class, DriverPrefsEntity::class], version = 1, exportSchema = false)
@TypeConverters(OrderEntityConverters::class)
abstract class LocalDatabase : RoomDatabase() {
    abstract fun orderDao(): OrderDao
    abstract fun prefsDao(): PrefsDao

    companion object {
        @Volatile
        private var INSTANCE: LocalDatabase? = null

        fun getInstance(context: android.content.Context): LocalDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    LocalDatabase::class.java,
                    "driver_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                .also { INSTANCE = it }
            }
        }
    }
}