package com.smartsoko.driver

import android.app.Application
import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import dagger.hilt.android.HiltAndroidApp
import timber.log.Timber

@HiltAndroidApp
class SmartSokoDriverApp : Application() {
    override fun onCreate() {
        super.onCreate()
        if (com.smartsoko.driver.util.AppConfig.DEBUG_MODE) Timber.plant(Timber.DebugTree())
        createNotificationChannels()
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
