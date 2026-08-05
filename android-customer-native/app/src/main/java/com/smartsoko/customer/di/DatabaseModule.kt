package com.smartsoko.customer.di

import android.content.Context
import androidx.room.Room
import com.smartsoko.customer.data.local.SmartsokoDatabase
import com.smartsoko.customer.data.local.dao.*
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {
    
    @Provides
    @Singleton
    fun provideSmartsokoDatabase(
        @ApplicationContext context: Context
    ): SmartsokoDatabase {
        return Room.databaseBuilder(
            context,
            SmartsokoDatabase::class.java,
            "smartsoko_database"
        )
            .fallbackToDestructiveMigration()
            .build()
    }
    
    @Provides
    fun provideProductDao(database: SmartsokoDatabase): ProductDao {
        return database.productDao()
    }
    
    @Provides
    fun provideOrderDao(database: SmartsokoDatabase): OrderDao {
        return database.orderDao()
    }
    
    @Provides
    fun provideCartDao(database: SmartsokoDatabase): CartDao {
        return database.cartDao()
    }
    
    @Provides
    fun provideUserDao(database: SmartsokoDatabase): UserDao {
        return database.userDao()
    }
    
    @Provides
    fun provideAddressDao(database: SmartsokoDatabase): AddressDao {
        return database.addressDao()
    }
}
