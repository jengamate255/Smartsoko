package com.smartsoko.driver.data.local

import android.content.Context
import com.smartsoko.driver.data.local.entity.DriverPrefsEntity
import com.smartsoko.driver.data.local.entity.OrderEntity
import com.fooddelivery.driver.BuildConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.io.File

object DebugSeed {
    fun seedIfRequested(context: Context) {
        if (!BuildConfig.DEBUG) return
        val dir = context.getExternalFilesDir(null) ?: return
        val file = File(dir, "vr_seed.json")
        if (!file.exists()) return
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
        scope.launch {
            try {
                val json = JSONObject(file.readText())
                val orderId = json.getString("orderId")
                val db = AppDatabase.getInstance(context)
                db.orderDao().insertOrder(
                    OrderEntity(
                        id = orderId,
                        pickupName = json.getString("pickupName"),
                        pickupAddress = json.getString("pickupAddress"),
                        pickupLat = json.getDouble("pickupLat"),
                        pickupLng = json.getDouble("pickupLng"),
                        dropoffName = json.getString("dropoffName"),
                        dropoffAddress = json.getString("dropoffAddress"),
                        dropoffLat = json.getDouble("dropoffLat"),
                        dropoffLng = json.getDouble("dropoffLng"),
                        customerName = json.optString("customerName"),
                        customerPhone = json.optString("customerPhone"),
                        itemsJson = json.optString("itemsJson"),
                        totalAmount = json.getDouble("totalAmount"),
                        deliveryFee = json.getDouble("deliveryFee"),
                        status = json.getString("status"),
                        estimatedDistance = json.getDouble("estimatedDistance"),
                        estimatedDuration = json.optString("estimatedDuration"),
                        createdAt = json.getLong("createdAt"),
                        updatedAt = json.getLong("updatedAt"),
                        deliveryInstructions = json.optString("deliveryInstructions"),
                        isSynced = true
                    )
                )
                db.driverPrefsDao().upsert(
                    DriverPrefsEntity(
                        id = 1,
                        isOnline = json.optBoolean("isOnline", true),
                        activeOrderId = orderId,
                        lastKnownLat = json.getDouble("lastKnownLat"),
                        lastKnownLng = json.getDouble("lastKnownLng"),
                        lastKnownBearing = json.optDouble("lastKnownBearing", 0.0).toFloat()
                    )
                )
                file.delete()
            } catch (t: Throwable) {
                t.printStackTrace()
            }
        }
    }
}