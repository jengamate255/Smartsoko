package com.smartsoko.customer.data.local

import androidx.room.Database
import androidx.room.RoomDatabase
import com.smartsoko.customer.data.local.entity.AddressEntity
import com.smartsoko.customer.data.local.entity.CartItemEntity
import com.smartsoko.customer.data.local.entity.OrderEntity
import com.smartsoko.customer.data.local.entity.PaymentMethodEntity
import com.smartsoko.customer.data.local.entity.ProductEntity
import com.smartsoko.customer.data.local.entity.UserEntity
import com.smartsoko.customer.data.local.converter.Converters

@Database(
    entities = [
        ProductEntity::class,
        CategoryEntity::class,
        CartItemEntity::class,
        OrderEntity::class,
        PaymentMethodEntity::class,
        AddressEntity::class,
        UserEntity::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun productDao(): ProductDao
    abstract fun categoryDao(): CategoryDao
    abstract fun cartDao(): CartDao
    abstract fun orderDao(): OrderDao
    abstract fun authDao(): AuthDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: android.content.Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = androidx.room.Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "smartsoko.db"
                )
                    .addCallback(DatabaseCallback())
                    .addEntityInfo(true)
                    .build()
                INSTANCE = instance
                instance
            }
        }

        private class DatabaseCallback : RoomDatabase.Callback() {
            override fun onOpen(db: androidx.sqlite.db.SupportSQLiteDatabase) {
                super.onOpen(db)
                
                // Migrate data if needed
                // Enable foreign key constraints
                db.execSQL("PRAGMA foreign_keys = ON;")
            }
        }
    }
}