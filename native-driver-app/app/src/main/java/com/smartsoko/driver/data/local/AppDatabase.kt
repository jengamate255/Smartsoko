package com.smartsoko.driver.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import com.smartsoko.driver.data.local.dao.DriverPrefsDao
import com.smartsoko.driver.data.local.dao.LocationQueueDao
import com.smartsoko.driver.data.local.dao.OrderDao
import com.smartsoko.driver.data.local.entity.DriverPrefsEntity
import com.smartsoko.driver.data.local.entity.LocationQueueEntity
import com.smartsoko.driver.data.local.entity.OrderEntity

@Database(
    entities = [OrderEntity::class, DriverPrefsEntity::class, LocationQueueEntity::class],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun orderDao(): OrderDao
    abstract fun driverPrefsDao(): DriverPrefsDao
    abstract fun locationQueueDao(): LocationQueueDao

    companion object {
        @Volatile private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "smartsoko_driver.db"
                ).fallbackToDestructiveMigration().build().also { INSTANCE = it }
            }
        }
    }
}
