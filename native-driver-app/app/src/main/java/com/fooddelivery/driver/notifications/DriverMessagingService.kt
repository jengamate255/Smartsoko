package com.fooddelivery.driver.notifications

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import com.fooddelivery.driver.R
import com.fooddelivery.driver.ui.MainActivity
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

/**
 * Firebase Messaging Service to handle incoming push notifications.
 * Enhanced with order-specific notifications and actions.
 */
class DriverMessagingService : FirebaseMessagingService() {

    private val CHANNEL_ID = "driver_orders"

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val name = "Driver Orders"
            val descriptionText = "Notifications for new orders and updates"
            val importance = NotificationManager.IMPORTANCE_HIGH
            val channel = NotificationChannel(CHANNEL_ID, name, importance).apply {
                description = descriptionText
                enableLights(true)
                enableVibration(true)
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
            val title = data["title"] ?: "New Order Available"
            val body = data["body"] ?: "You have a new order available"
            val orderId = data["orderId"]
            val type = data["type"] ?: "new_order"
            val clickAction = data["click_action"] // Optional: what to do when the notification is clicked

            createOrderNotification(title, body, orderId, type, clickAction)
        }

        // Handle notification payload (if the notification is sent directly from the console or via the HTTP v1 API)
        remoteMessage.notification?.let {
            val title = it.title ?: "New Order Available"
            val body = it.body ?: "You have a new order available"
            createOrderNotification(title, body, null, "new_order", null)
        }
    }

    private fun createOrderNotification(title: String, body: String, orderId: String?, type: String, clickAction: String?) {
        val notificationManager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create notification
        val notificationBuilder = NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(com.fooddelivery.driver.R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)
            .setDefaults(NotificationCompat.DEFAULT_ALL)

        // Add appropriate actions based on notification type
        when (type) {
            "new_order" -> {
                if (orderId != null) {
                    // Add action buttons for new order
                    val detailIntent = Intent(this, MainActivity::class.java).apply {
                        action = "VIEW_ORDER"
                        putExtra("orderId", orderId)
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }

                    val detailPendingIntent = PendingIntent.getActivity(
                        this,
                        orderId.hashCode(),
                        detailIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    notificationBuilder.addAction(
                        com.fooddelivery.driver.R.drawable.ic_order,
                        "View Order",
                        detailPendingIntent
                    )

                    val acceptIntent = Intent(this, DriverMessagingService::class.java).apply {
                        action = "ACCEPT_ORDER"
                        putExtra("orderId", orderId)
                    }

                    val acceptPendingIntent = PendingIntent.getService(
                        this,
                        orderId.hashCode() + 1000,
                        acceptIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    notificationBuilder.addAction(
                        com.fooddelivery.driver.R.drawable.ic_accept,
                        "Accept Order",
                        acceptPendingIntent
                    )
                }
            }

            "order_status" -> {
                if (orderId != null) {
                    val detailIntent = Intent(this, MainActivity::class.java).apply {
                        action = "VIEW_ORDER_STATUS"
                        putExtra("orderId", orderId)
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }

                    val detailPendingIntent = PendingIntent.getActivity(
                        this,
                        orderId.hashCode(),
                        detailIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    notificationBuilder.addAction(
                        com.fooddelivery.driver.R.drawable.ic_order,
                        "View Status",
                        detailPendingIntent
                    )
                }
            }

            "chat_message" -> {
                if (orderId != null) {
                    val chatIntent = Intent(this, MainActivity::class.java).apply {
                        action = "VIEW_CHAT"
                        putExtra("orderId", orderId)
                        flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                    }

                    val chatPendingIntent = PendingIntent.getActivity(
                        this,
                        orderId.hashCode(),
                        chatIntent,
                        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                    )

                    notificationBuilder.addAction(
                        com.fooddelivery.driver.R.drawable.ic_chat,
                        "View Chat",
                        chatPendingIntent
                    )
                }
            }

            else -> {
                val detailIntent = Intent(this, MainActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
                }

                val detailPendingIntent = PendingIntent.getActivity(
                    this,
                    0,
                    detailIntent,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )

                notificationBuilder.addAction(
                    com.fooddelivery.driver.R.drawable.ic_order,
                    "View Details",
                    detailPendingIntent
                )
            }
        }

        // Set content intent
        val contentIntent = if (orderId != null) {
            val contentDetailIntent = Intent(this, MainActivity::class.java).apply {
                action = when (type) {
                    "new_order" -> "VIEW_ORDER"
                    "order_status" -> "VIEW_ORDER_STATUS"
                    "chat_message" -> "VIEW_CHAT"
                    else -> "VIEW_ORDER"
                }
                putExtra("orderId", orderId)
                flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            PendingIntent.getActivity(
                this,
                orderId.hashCode() + 2000,
                contentDetailIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else {
            val defaultIntent = Intent(this, MainActivity::class.java)
            PendingIntent.getActivity(
                this,
                0,
                defaultIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }

        notificationBuilder.setContentIntent(contentIntent)

        // Show notification (stable id per order so updates replace, not stack)
        notificationManager.notify(
            (orderId ?: "unknown").hashCode(),
            notificationBuilder.build()
        )
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        // TODO: Send this token to your backend for notification delivery
        println("DriverMessagingService: Driver FCM token generated: $token")
    }

    override fun onDestroy() {
        super.onDestroy()
    }
}