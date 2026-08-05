package com.smartsoko.driver.notification

import android.app.PendingIntent
import android.content.Intent
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage
import com.smartsoko.driver.R
import com.smartsoko.driver.SmartSokoDriverApp
import com.smartsoko.driver.ui.MainActivity

class DriverMessagingService : FirebaseMessagingService() {

    override fun onNewToken(token: String) {
        Log.d("FCM", "New token: $token")
    }

    override fun onMessageReceived(message: RemoteMessage) {
        val data = message.data
        val type = data["type"] ?: "general"

        when (type) {
            "new_order" -> {
                val orderId = data["order_id"] ?: ""
                val title = data["title"] ?: getString(R.string.new_order_title)
                val body = data["body"] ?: "You have a new delivery request"
                showNotification(title, body, "order/$orderId")
            }
            "order_update" -> {
                val title = data["title"] ?: "Order Update"
                val body = data["body"] ?: "Your order has been updated"
                val orderId = data["order_id"] ?: ""
                showNotification(title, body, "order/$orderId")
            }
            "system" -> {
                val title = data["title"] ?: "System Update"
                val body = data["body"] ?: ""
                showNotification(title, body, null)
            }
            else -> {
                val title = data["title"] ?: "SmartSoko Driver"
                val body = data["body"] ?: ""
                showNotification(title, body, null)
            }
        }
    }

    private fun showNotification(title: String, body: String, deepLink: String?) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            deepLink?.let { putExtra("deep_link", it) }
        }

        val pendingIntent = PendingIntent.getActivity(
            this, System.currentTimeMillis().toInt(), intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(this, SmartSokoDriverApp.NEW_ORDER_CHANNEL)
            .setSmallIcon(R.drawable.ic_notification)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .setVibrate(longArrayOf(0, 200, 100, 200))
            .build()

        try {
            NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
        } catch (e: SecurityException) {
            Log.e("FCM", "No notification permission", e)
        }
    }
}
