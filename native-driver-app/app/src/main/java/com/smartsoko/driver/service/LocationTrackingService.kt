package com.smartsoko.driver.service

import android.app.Notification
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.Priority
import com.smartsoko.driver.R
import com.smartsoko.driver.SmartSokoDriverApp
import com.smartsoko.driver.data.local.AppDatabase
import com.smartsoko.driver.data.local.entity.LocationQueueEntity
import com.smartsoko.driver.data.remote.WebSocketManager
import com.smartsoko.driver.domain.model.Location
import com.smartsoko.driver.ui.MainActivity
import com.smartsoko.driver.util.AppConfig
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import javax.inject.Inject

@AndroidEntryPoint
class LocationTrackingService : Service() {

    @Inject lateinit var fusedLocationClient: FusedLocationProviderClient
    @Inject lateinit var locationState: LocationState
    @Inject lateinit var webSocketManager: WebSocketManager
    @Inject lateinit var database: AppDatabase

    private val locationCallback = object : LocationCallback() {
        override fun onLocationResult(result: LocationResult) {
            result.lastLocation?.let { loc ->
                val location = Location(
                    lat = loc.latitude,
                    lng = loc.longitude,
                    bearing = loc.bearing,
                    speed = loc.speed,
                    accuracy = loc.accuracy,
                    timestamp = System.currentTimeMillis()
                )
                    locationState.update(location)

                CoroutineScope(Dispatchers.IO).launch {
                    database.locationQueueDao().enqueue(LocationQueueEntity(
                        lat = location.lat, lng = location.lng,
                        bearing = location.bearing, speed = location.speed,
                        timestamp = location.timestamp
                    ))
                }

                webSocketManager.sendLocationUpdate(location)
            }
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, createNotification())
        startLocationUpdates()
        locationState.setTracking(true)
        return START_STICKY
    }

    private fun startLocationUpdates() {
        val request = LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, AppConfig.LOCATION_UPDATE_INTERVAL_MS)
            .setMinUpdateIntervalMillis(AppConfig.LOCATION_FASTEST_INTERVAL_MS)
            .setMaxUpdateDelayMillis(5000L)
            .build()

        if (checkSelfPermission(android.Manifest.permission.ACCESS_FINE_LOCATION)
            == android.content.pm.PackageManager.PERMISSION_GRANTED
        ) {
            fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
        }
    }

    private fun createNotification(): Notification {
        val pendingIntent = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, SmartSokoDriverApp.LOCATION_CHANNEL)
            .setContentTitle(getString(R.string.app_name))
            .setContentText(getString(R.string.tracking_description))
            .setSmallIcon(R.drawable.ic_notification)
            .setContentIntent(pendingIntent)
            .setOngoing(true)
            .setSilent(true)
            .build()
    }

    override fun onDestroy() {
        fusedLocationClient.removeLocationUpdates(locationCallback)
        locationState.setTracking(false)
        super.onDestroy()
    }

    companion object {
        private const val NOTIFICATION_ID = 1001

        fun start(context: Context) {
            val intent = Intent(context, LocationTrackingService::class.java)
            context.startForegroundService(intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, LocationTrackingService::class.java))
        }
    }
}
