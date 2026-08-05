package com.fooddelivery.driver.util

import com.fooddelivery.driver.BuildConfig

/**
 * App Configuration - Replace these placeholder values with your actual credentials
 */
object AppConfig {
    
    // ====================
    // FIREBASE CONFIG
    // ====================
    // The google-services.json file should be placed in:
    // app/google-services.json
    // No code changes needed once file is added
    
    // ====================
    // MAPBOX CONFIG
    // ====================
    // Injected via buildConfigField in app/build.gradle.kts (see MAPBOX_ACCESS_TOKEN)
    val MAPBOX_ACCESS_TOKEN = BuildConfig.MAPBOX_ACCESS_TOKEN
    
    // ====================
    // SUPABASE CONFIG
    // ====================
    // Get your credentials from: https://supabase.com/ -> Project Settings -> API
    const val SUPABASE_URL = "https://vonkqyiczeqhuqhahsxm.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8"
    
    // ====================
    // BACKEND API CONFIG
    // ====================
    // Injected via buildConfigField in app/build.gradle.kts (per build type)
    // Debug (adb reverse tcp:3000 tcp:3000): http://localhost:3000/
    // Emulator: use adb reverse, or switch to http://10.0.2.2:3000/
    // Production: https://your-domain.com/ (set in release buildType)
    val API_BASE_URL = BuildConfig.API_BASE_URL
    
    // ====================
    // WEBSOCKET CONFIG
    // ====================
    // Injected via buildConfigField in app/build.gradle.kts (per build type)
    val WEBSOCKET_URL = BuildConfig.WEBSOCKET_URL
    
    // ====================
    // APP SETTINGS
    // ====================
    const val APP_NAME = "SmartSoko Driver"
    const val PACKAGE_NAME = "com.fooddelivery.driver"
    
    // Location settings
    const val LOCATION_UPDATE_INTERVAL_MS = 5000L // 5 seconds
    const val LOCATION_FASTEST_INTERVAL_MS = 3000L // 3 seconds
    
    // Order sync settings
    const val ORDER_SYNC_INTERVAL_MS = 30000L // 30 seconds
    
    // Debug mode - derived from build type so logging is stripped from release builds
    val DEBUG_MODE = BuildConfig.DEBUG
}