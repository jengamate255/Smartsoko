package com.fooddelivery.driver.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Firebase Messaging Service to handle incoming push notifications.
 */
class DriverMessagingService : FirebaseMessagingService() {

    private val CHANNEL_ID = "smartsoko_driver_channel"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "SmartSoko Driver Notifications"
            val descriptionText = "Notifications for new orders and updates"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
            }
            // Register the channel with the system
            val notificationManager: NotificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        // Handle data payload
        val data = remoteMessage.data
        if (data.isNotEmpty()) {
            // We expect a data payload with at least a title and body
            val title = data["title"] ?: "New Notification"
            val body = data["body"] ?: "You have a new update"
            val clickAction = data["click_action"] // Optional: what to do when the notification is clicked

            showNotification(title, body, clickAction)
        }

        // Handle notification payload (if the notification is sent directly from the console or via the HTTP v1 API)
        remoteMessage.notification?.let {
            val title = it.title ?: "New Notification"
            val body = it.body ?: "You have a new update"
            showNotification(title, body, null)
        }
    }

    private fun showNotification(title: String, body: String, clickAction: String?) {
        val intentIntent = if (clickAction != null && !clickAction.isEmpty()) {
            // If there's a click action, we can try to parse it as an intent or just open the app
            // For simplicity, we'll just open the main activity
            // In a real app, you might want to deep link to a specific screen
            android.content.Intent(this, MainActivity::class.java)
        } else {
            android.content.Intent(this, MainActivity::class.java)
        }.addFlags(android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP)

        val pendingIntent = android.app.PendingIntent.getActivity(
            this,
            0 /* Request code */,
            intentIntent,
            android.app.PendingIntent.FLAG_UPDATE_CURRENT or android.app.PendingIntent.FLAG_IMMUTABLE
        )

        val builder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_notification) // You'll need to add this icon
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)

        val notificationManager: NotificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Use a unique ID for each notification so they don't overwrite each other
        val notificationId = java.lang.System.currentTimeMillis().toInt()
        notificationManager.notify(notificationId, builder.build())
    }
}