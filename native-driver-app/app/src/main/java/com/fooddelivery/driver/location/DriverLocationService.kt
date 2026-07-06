package com.fooddelivery.driver.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.fooddelivery.driver.R
import com.fooddelivery.driver.ui.MainActivity
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.Priority
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class DriverLocationService : Service() {

    @Inject lateinit var fusedLocationClient: FusedLocationProviderClient
    @Inject lateinit var locationState: LocationState

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { location ->
                locationState.update(location)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        startLocationUpdates()
        return START_STICKY
    }

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, UPDATE_INTERVAL_MS)
            .setMinUpdateIntervalMillis(FASTEST_INTERVAL_MS)
            .build()

        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
            == android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            fusedLocationClient.requestLocationUpdates(
                request, locationCallback, Looper.getMainLooper()
            )
        }
    }

    private fun createNotification(): Notification {
        val channelId = "driver_location_channel"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId, "Driver Location",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Location tracking for order delivery"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }

        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, channelId)
            .setContentTitle("SmartSoko Driver")
            .setContentText("Tracking your location for deliveries")
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .build()
    }

    override fun onDestroy() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
        super.onDestroy()
    }

    companion object {
        private const val NOTIFICATION_ID = 1001
        private const val UPDATE_INTERVAL_MS = 5000L
        private const val FASTEST_INTERVAL_MS = 3000L

        fun start(context: Context) {
            val intent = Intent(context, DriverLocationService::class.java)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(intent)
            } else {
                context.startService(intent)
            }
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, DriverLocationService::class.java))
        }
    }
}
