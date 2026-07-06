package com.fooddelivery.driver.util

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
    // Get your token from: https://account.mapbox.com/access-tokens/
    // Set via local.properties or environment variable
    const val MAPBOX_ACCESS_TOKEN = System.getenv("MAPBOX_ACCESS_TOKEN") ?: "YOUR_MAPBOX_PUBLIC_TOKEN_HERE"
    
    // ====================
    // SUPABASE CONFIG
    // ====================
    // Get your credentials from: https://supabase.com/ -> Project Settings -> API
    const val SUPABASE_URL = "https://vonkqyiczeqhuqhahsxm.supabase.co"
    const val SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvbmtxeWljemVxaHVxaGFoc3htIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4MjIzNDksImV4cCI6MjA5MDM5ODM0OX0.UKAT3re6P_oAB3E1svwCFdqTQWZL6yulJ1ZX4nAgJJ8"
    
    // ====================
    // BACKEND API CONFIG
    // ====================
    // Your Node.js/Express backend URL
    // Dev: http://10.0.2.2:3000/api (Android emulator -> localhost)
    // Production: https://your-domain.com/api
    const val API_BASE_URL = "http://10.0.2.2:3000/api"
    
    // ====================
    // WEBSOCKET CONFIG
    // ====================
    // Your WebSocket server URL
    // Dev: http://10.0.2.2:3000 (Android emulator -> localhost, Socket.IO path)
    // Production: https://your-domain.com
    const val WEBSOCKET_URL = "http://10.0.2.2:3000"
    
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
    
    // Debug mode
    const val DEBUG_MODE = true
}