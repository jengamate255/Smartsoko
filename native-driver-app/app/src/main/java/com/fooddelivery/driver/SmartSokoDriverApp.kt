package com.fooddelivery.driver

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import com.fooddelivery.driver.notifications.DriverMessagingService
import com.google.firebase.FirebaseApp
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class SmartSokoDriverApp : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        createNotificationChannels()
        // Register any existing FCM token with the backend (fires when a user is signed in)
        DriverMessagingService.registerExistingToken()
    }

    private fun createNotificationChannels() {
        val manager = getSystemService(NotificationManager::class.java)
        val channels = listOf(
            NotificationChannel(NEW_ORDER_CHANNEL, "New Orders", NotificationManager.IMPORTANCE_HIGH).apply {
                description = "New delivery order notifications"
            },
            NotificationChannel(LOCATION_CHANNEL, "Location Tracking", NotificationManager.IMPORTANCE_LOW).apply {
                description = "Location tracking for deliveries"
            },
            NotificationChannel(UPDATE_CHANNEL, "Order Updates", NotificationManager.IMPORTANCE_DEFAULT).apply {
                description = "Order status updates"
            }
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            channels.forEach { manager.createNotificationChannel(it) }
        }
    }

    companion object {
        const val NEW_ORDER_CHANNEL = "new_orders"
        const val LOCATION_CHANNEL = "location_tracking"
        const val UPDATE_CHANNEL = "order_updates"
    }
}
