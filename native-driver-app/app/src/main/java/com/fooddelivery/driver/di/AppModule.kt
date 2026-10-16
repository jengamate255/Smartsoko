package com.fooddelivery.driver.di

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.fooddelivery.driver.data.LocalDatabase
import com.fooddelivery.driver.data.SupabaseClient
import com.smartsoko.driver.navigation.NavigationManager
import com.fooddelivery.driver.network.ApiService
import com.fooddelivery.driver.network.RouteProvider
import com.fooddelivery.driver.repository.OrderRepository
import com.fooddelivery.driver.realtime.SocketManager
import com.fooddelivery.driver.data.AuthRepository
import com.fooddelivery.driver.util.AppConfig
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import dagger.Module
import dagger.Provides
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.io.File
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

// Navigation preferences keys
private const val PREFS_NAV_ENGINE = "navigation_engine"
private const val PREFS_VOICE_ENABLED = "navigation_voice_enabled"
private const val PREFS_VOICE_VOLUME = "navigation_voice_volume"

// Navigation engine options
enum class NavigationEngine(val value: String, val label: String) {
    MAPBOX("mapbox", "Mapbox Turn-by-Turn"),
    GOOGLE_MAPS("google_maps", "Google Maps"),
    AUTO("auto", "Auto (Mapbox with Google fallback)")
}

// SharedPreferences extension functions for navigation preferences
fun SharedPreferences.getNavigationEngine(): NavigationEngine {
    return NavigationEngine.values().firstOrNull { it.value == getString(PREFS_NAV_ENGINE, "") }
        ?: NavigationEngine.AUTO
}

fun SharedPreferences.setNavigationEngine(engine: NavigationEngine) {
    edit().putString(PREFS_NAV_ENGINE, engine.value).apply()
}

fun SharedPreferences.isVoiceGuidanceEnabled(): Boolean {
    return getBoolean(PREFS_VOICE_ENABLED, true)
}

fun SharedPreferences.setVoiceGuidanceEnabled(enabled: Boolean) {
    edit().putBoolean(PREFS_VOICE_ENABLED, enabled).apply()
}

fun SharedPreferences.getVoiceVolume(): Float {
    return getFloat(PREFS_VOICE_VOLUME, 1.0f)
}

fun SharedPreferences.setVoiceVolume(volume: Float) {
    edit().putFloat(PREFS_VOICE_VOLUME, volume.coerceIn(0f, 1f)).apply()
}

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

        // Supabase Edge Functions require the apikey header on every request.
        // The Firebase ID token (sent by ApiService as "Authorization: Bearer ...")
        // is remapped to x-firebase-token, because the Supabase gateway rejects
        // non-Supabase JWTs in the Authorization header. The anon key takes its place.
        val supabaseApikeyInterceptor = okhttp3.Interceptor { chain ->
            val request = chain.request()
            val existingAuth = request.header("Authorization")
            var builder = request.newBuilder().header("apikey", AppConfig.SUPABASE_ANON_KEY)
            if (existingAuth != null && existingAuth.startsWith("Bearer ")) {
                builder = builder
                    .removeHeader("Authorization")
                    .header("x-firebase-token", existingAuth.removePrefix("Bearer "))
                    .header("Authorization", "Bearer ${AppConfig.SUPABASE_ANON_KEY}")
            } else if (existingAuth == null) {
                builder = builder.header("Authorization", "Bearer ${AppConfig.SUPABASE_ANON_KEY}")
            }
            chain.proceed(builder.build())
        }

        return OkHttpClient.Builder()
            .addInterceptor(supabaseApikeyInterceptor)
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
    // Shared Preferences for auth token (encrypted at rest)
    // ====================
    @Provides
    @Singleton
    fun provideSharedPreferences(@ApplicationContext context: Context): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        // Migrate away from the legacy plaintext file that shares the same name.
        // EncryptedSharedPreferences reads it as encrypted values, so it must be removed.
        val legacyFile = File(context.applicationContext.filesDir, "shared_prefs/smartsoko_driver_prefs.xml")
        if (legacyFile.exists()) {
            legacyFile.delete()
        }

        return EncryptedSharedPreferences.create(
            context,
            "smartsoko_driver_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    // ====================
    // Navigation Manager (Mapbox Navigation SDK)
    // ====================
    @Provides
    @Singleton
    fun provideNavigationManager(@ApplicationContext context: Context, routeProvider: RouteProvider): NavigationManager {
        return NavigationManager(context, routeProvider)
    }

    // ====================
    // Route Provider (Mapbox Directions API)
    // ====================
    @Provides
    @Singleton
    fun provideRouteProvider(@ApplicationContext context: Context): RouteProvider {
        return RouteProvider(AppConfig.MAPBOX_ACCESS_TOKEN)
    }

    // ====================
    // SharedPreferences Entry Point
    // ====================
    @EntryPoint
    @InstallIn(SingletonComponent::class)
    interface SharedPreferencesEntryPoint {
        fun sharedPreferences(): SharedPreferences
    }

    // ====================
    // Socket Manager
    // ====================
    @Provides
    @Singleton
    fun provideSocketManager(
        @ApplicationContext context: Context,
        sharedPreferences: SharedPreferences
    ): SocketManager {
        val authToken = sharedPreferences.getString("firebase_auth_token", "") ?: ""
        // Supabase Realtime WebSocket: Phoenix protocol endpoint for Postgres Changes.
        // The anon key travels as the apikey query parameter (same as the JS client).
        val realtimeUrl = "${AppConfig.SUPABASE_URL}/realtime/v1/websocket" +
            "?apikey=${AppConfig.SUPABASE_ANON_KEY}&vsn=1.0.0"
        return SocketManager(
            context = context,
            serverUrl = realtimeUrl,
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

    // ====================
    // Auth Repository (Firebase-based)
    // ====================
    @Provides
    @Singleton
    fun provideAuthRepository(): AuthRepository {
        return AuthRepository()
    }

    // ====================
    // Fused Location Provider
    // ====================
    @Provides
    @Singleton
    fun provideFusedLocationProviderClient(@ApplicationContext context: Context): FusedLocationProviderClient {
        return LocationServices.getFusedLocationProviderClient(context)
    }

    // ====================
    // Order Repository
    // ====================
    @Provides
    fun provideOrderRepository(
        localDatabase: LocalDatabase,
        socketManager: SocketManager,
        apiService: ApiService
    ): OrderRepository {
        return OrderRepository(
            localDatabase = localDatabase,
            socketManager = socketManager,
            apiService = apiService
        )
    }
}