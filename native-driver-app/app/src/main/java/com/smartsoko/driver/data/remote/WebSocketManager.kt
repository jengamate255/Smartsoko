package com.smartsoko.driver.data.remote

import android.util.Log
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.smartsoko.driver.data.remote.dto.OrderDto
import com.smartsoko.driver.domain.model.Location
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.receiveAsFlow
import okhttp3.*
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

sealed class WsEvent {
    data class NewOrder(val order: OrderDto) : WsEvent()
    data class OrderAccepted(val orderId: String) : WsEvent()
    data class OrderRejected(val orderId: String) : WsEvent()
    data class OrderStatusChanged(val orderId: String, val status: String) : WsEvent()
    data class DriverLocationAck(val timestamp: Long) : WsEvent()
    data object Connected : WsEvent()
    data class Error(val message: String) : WsEvent()
}

@Singleton
class WebSocketManager @Inject constructor() {
    private val gson = Gson()
    private var webSocket: WebSocket? = null
    private var okHttpClient: OkHttpClient? = null
    private var serverUrl: String = ""
    private var authToken: String = ""
    private var shouldReconnect = true
    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 10

    private val _events = Channel<WsEvent>(Channel.BUFFERED)
    val events: Flow<WsEvent> = _events.receiveAsFlow()

    fun connect(serverUrl: String, authToken: String) {
        this.serverUrl = serverUrl
        this.authToken = authToken
        this.shouldReconnect = true
        doConnect()
    }

    private fun doConnect() {
        okHttpClient?.dispatcher?.executorService?.shutdown()

        okHttpClient = OkHttpClient.Builder()
            .readTimeout(0, TimeUnit.MILLISECONDS)
            .pingInterval(30, TimeUnit.SECONDS)
            .build()

        val request = Request.Builder()
            .url("$serverUrl/ws/driver?token=$authToken")
            .build()

        webSocket = okHttpClient?.newWebSocket(request, object : WebSocketListener() {
            override fun onOpen(ws: WebSocket, response: Response) {
                Log.d("WebSocket", "Connected")
                reconnectAttempts = 0
                _events.trySend(WsEvent.Connected)
            }

            override fun onMessage(ws: WebSocket, text: String) {
                try {
                    val json = gson.fromJson(text, JsonObject::class.java)
                    val type = json.get("type")?.asString ?: return

                    when (type) {
                        "new_order" -> {
                            val data = gson.fromJson(json.get("data"), OrderDto::class.java)
                            _events.trySend(WsEvent.NewOrder(data))
                        }
                        "order_accepted" -> {
                            val id = json.get("order_id")?.asString ?: return
                            _events.trySend(WsEvent.OrderAccepted(id))
                        }
                        "order_rejected" -> {
                            val id = json.get("order_id")?.asString ?: return
                            _events.trySend(WsEvent.OrderRejected(id))
                        }
                        "order_status_changed" -> {
                            val id = json.get("order_id")?.asString ?: return
                            val status = json.get("status")?.asString ?: return
                            _events.trySend(WsEvent.OrderStatusChanged(id, status))
                        }
                        "location_ack" -> {
                            val ts = json.get("timestamp")?.asLong ?: 0L
                            _events.trySend(WsEvent.DriverLocationAck(ts))
                        }
                    }
                } catch (e: Exception) {
                    Log.e("WebSocket", "Parse error", e)
                }
            }

            override fun onClosing(ws: WebSocket, code: Int, reason: String) {
                ws.close(1000, null)
                attemptReconnect()
            }

            override fun onClosed(ws: WebSocket, code: Int, reason: String) {
                attemptReconnect()
            }

            override fun onFailure(ws: WebSocket, t: Throwable, response: Response?) {
                Log.e("WebSocket", "Failure", t)
                attemptReconnect()
            }
        })
    }

    private fun attemptReconnect() {
        if (!shouldReconnect || reconnectAttempts >= maxReconnectAttempts) return
        reconnectAttempts++
        val delay = (reconnectAttempts * 2000L).coerceAtMost(15000L)
        okHttpClient?.dispatcher?.executorService?.submit {
            try {
                Thread.sleep(delay)
                doConnect()
            } catch (_: InterruptedException) {}
        }
    }

    fun sendLocationUpdate(location: Location) {
        val json = JsonObject().apply {
            addProperty("type", "driver_location")
            addProperty("lat", location.lat)
            addProperty("lng", location.lng)
            addProperty("bearing", location.bearing.toDouble())
            addProperty("speed", location.speed.toDouble())
            addProperty("timestamp", location.timestamp)
        }
        webSocket?.send(gson.toJson(json))
    }

    fun sendOrderAccepted(orderId: String) {
        val json = JsonObject().apply {
            addProperty("type", "accept_order")
            addProperty("order_id", orderId)
        }
        webSocket?.send(gson.toJson(json))
    }

    fun sendOrderStatus(orderId: String, status: String) {
        val json = JsonObject().apply {
            addProperty("type", "update_status")
            addProperty("order_id", orderId)
            addProperty("status", status)
        }
        webSocket?.send(gson.toJson(json))
    }

    fun goOnline() {
        val json = JsonObject().apply { addProperty("type", "go_online") }
        webSocket?.send(gson.toJson(json))
    }

    fun goOffline() {
        val json = JsonObject().apply { addProperty("type", "go_offline") }
        webSocket?.send(gson.toJson(json))
    }

    fun disconnect() {
        shouldReconnect = false
        webSocket?.close(1000, "Driver going offline")
        webSocket = null
        okHttpClient?.dispatcher?.executorService?.shutdown()
    }
}
