package com.smartsoko.driver.di

import android.content.Context
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.smartsoko.driver.data.local.AppDatabase
import com.smartsoko.driver.data.local.dao.DriverPrefsDao
import com.smartsoko.driver.data.local.dao.LocationQueueDao
import com.smartsoko.driver.data.local.dao.OrderDao
import com.smartsoko.driver.data.remote.ApiService
import com.smartsoko.driver.util.AppConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideGson(): Gson = GsonBuilder().create()

    // OkHttpClient, Retrofit, FusedLocationProviderClient provided by com.fooddelivery.driver.di.AppModule

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): AppDatabase {
        return AppDatabase.getInstance(context)
    }

    @Provides
    fun provideOrderDao(db: AppDatabase): OrderDao = db.orderDao()

    @Provides
    fun provideDriverPrefsDao(db: AppDatabase): DriverPrefsDao = db.driverPrefsDao()

    @Provides
    fun provideLocationQueueDao(db: AppDatabase): LocationQueueDao = db.locationQueueDao()

    @Provides
    @Singleton
    fun provideApiService(): ApiService {
        // This will use the Retrofit from the main module
        return com.fooddelivery.driver.di.AppModule.provideRetrofit(
            com.fooddelivery.driver.di.AppModule.provideOkHttpClient()
        ).create(ApiService::class.java)
    }
}
