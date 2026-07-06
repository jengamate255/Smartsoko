package com.fooddelivery.driver.di

import android.content.Context
import android.content.SharedPreferences
import com.fooddelivery.driver.data.LocalDatabase
import com.fooddelivery.driver.data.PrefsDao
import com.fooddelivery.driver.data.SupabaseClient
import com.fooddelivery.driver.network.ApiService
import com.fooddelivery.driver.repository.OrderRepository
import com.fooddelivery.driver.realtime.SocketManager
import com.fooddelivery.driver.util.AppConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    // ====================
    // Supabase Client
    // ====================
    @Provides
    fun provideSupabaseClient(): SupabaseClient {
        return SupabaseClient(
            supabaseUrl = AppConfig.SUPABASE_URL,
            supabaseAnonKey = AppConfig.SUPABASE_ANON_KEY
        )
    }

    // ====================
    // Retrofit / API Service
    // ====================
    @Provides
    fun provideOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (AppConfig.DEBUG_MODE) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }

        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(AppConfig.API_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    fun provideApiService(retrofit: Retrofit): ApiService {
        return retrofit.create(ApiService::class.java)
    }

    // ====================
    // Shared Preferences for auth token
    // ====================
    @Provides
    @Singleton
    fun provideSharedPreferences(@ApplicationContext context: Context): SharedPreferences {
        return context.getSharedPreferences("smartsoko_driver_prefs", Context.MODE_PRIVATE)
    }

    // ====================
    // Socket Manager
    // ====================
    @Provides
    @Singleton
    fun provideSocketManager(sharedPreferences: SharedPreferences): SocketManager {
        val authToken = sharedPreferences.getString("firebase_auth_token", "") ?: ""
        return SocketManager(
            serverUrl = AppConfig.WEBSOCKET_URL,
            authToken = authToken
        )
    }

    // ====================
    // Local Database
    // ====================
    @Provides
    fun provideLocalDatabase(@ApplicationContext context: Context): LocalDatabase {
        return LocalDatabase.getInstance(context)
    }

    @Provides
    fun providePrefsDao(localDatabase: LocalDatabase): PrefsDao {
        return localDatabase.prefsDao()
    }

    // ====================
    // Order Repository
    // ====================
    @Provides
    fun provideOrderRepository(
        localDatabase: LocalDatabase,
        socketManager: SocketManager,
        prefsDao: PrefsDao
    ): OrderRepository {
        return OrderRepository(
            localDatabase = localDatabase,
            socketManager = socketManager,
            prefsDao = prefsDao
        )
    }
}