package com.smartsoko.driver.location

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Build
import android.os.IBinder
import androidx.core.content.ContextCompat
import com.smartsoko.driver.data.repository.DriverRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

class DriverLocationService : Service(), LocationListener {

    private lateinit var locationManager: LocationManager
    private val repository = DriverRepository()
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private var driverId: String? = null

    override fun onCreate() {
        super.onCreate()
        locationManager = getSystemService(Context.LOCATION_SERVICE) as LocationManager
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val id = intent?.getStringExtra(EXTRA_DRIVER_ID)
        if (id.isNullOrBlank()) {
            stopSelf()
            return START_NOT_STICKY
        }
        driverId = id
        startForegroundCompat()
        registerLocationUpdates()
        return START_STICKY
    }

    private fun startForegroundCompat() {
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "Delivery tracking",
                    NotificationManager.IMPORTANCE_LOW
                )
            )
        }
        val notification = Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("SmartSoko Driver")
            .setContentText("Sharing your location while online")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .build()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun registerLocationUpdates() {
        val granted = ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED || ContextCompat.checkSelfPermission(
            this,
            android.Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        if (!granted) {
            stopSelf()
            return
        }
        listOf(LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER)
            .filter { locationManager.isProviderEnabled(it) }
            .forEach { provider ->
                try {
                    locationManager.requestLocationUpdates(
                        provider, MIN_TIME_MS, MIN_DISTANCE_M, this
                    )
                } catch (_: SecurityException) {
                }
            }
    }

    override fun onLocationChanged(location: Location) {
        val id = driverId ?: return
        scope.launch {
            repository.updateDriverLocation(id, location.latitude, location.longitude)
        }
    }

    override fun onDestroy() {
        locationManager.removeUpdates(this)
        scope.cancel()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    companion object {
        private const val CHANNEL_ID = "driver_location"
        private const val NOTIFICATION_ID = 1002
        private const val EXTRA_DRIVER_ID = "driver_id"
        private const val MIN_TIME_MS = 10_000L
        private const val MIN_DISTANCE_M = 20f

        fun start(context: Context, driverId: String) {
            val intent = Intent(context, DriverLocationService::class.java)
                .putExtra(EXTRA_DRIVER_ID, driverId)
            ContextCompat.startForegroundService(context, intent)
        }

        fun stop(context: Context) {
            context.stopService(Intent(context, DriverLocationService::class.java))
        }
    }
}
