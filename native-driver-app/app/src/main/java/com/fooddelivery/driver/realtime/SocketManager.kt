package com.fooddelivery.driver.realtime

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import okhttp3.*
import org.json.JSONObject
import java.util.Timer
import java.util.TimerTask
import java.util.concurrent.TimeUnit

/**
 * Manages the real-time connection for order updates using Supabase Realtime.
 *
 * The transport is a Phoenix WebSocket (https://www.phoenixframework.org) speaking
 * to `wss://<project-ref>.supabase.co/realtime/v1/websocket?apikey=<anon-key>&vsn=1.0.0`.
 * After joining the `realtime:orders` channel with a `postgres_changes` config, the
 * server pushes a `postgres_changes` message for every INSERT/UPDATE/DELETE on the
 * `orders` table that the connecting role is allowed to SELECT (RLS). We surface
 * INSERT/UPDATE events through the same [OrderUpdate] LiveData the rest of the app
 * already consumes, so no call sites change.
 *
 * Note: this socket is receive-only. The upstream is a database, so the emit* helpers
 * are intentionally no-ops (kept so ViewModel/repository call sites compile unchanged).
 */
class SocketManager(
    private val context: Context,
    private val serverUrl: String,
    private var authToken: String = ""
) {

    companion object {
        private const val TAG = "SocketManager"
        private const val CHANNEL_ORDERS = "realtime:orders"
        private const val CHANNEL_LOCATIONS = "realtime:driver_locations"
        private const val HEARTBEAT_INTERVAL_MS = 20000L
    }

    private var webSocket: WebSocket? = null
    private val orderUpdates = MutableLiveData<OrderUpdate>()
    private val locationUpdates = MutableLiveData<LocationUpdate>()
    private val chatMessages = MutableLiveData<ChatMessage>()
    private val client = OkHttpClient.Builder()
        .readTimeout(0, TimeUnit.MILLISECONDS)
        .pingInterval(30, TimeUnit.SECONDS)
        .connectTimeout(10, TimeUnit.SECONDS)
        .build()

    private var isConnected = false
    private var refCounter = 0
    private var ordersJoinRef = ""
    private var locationsJoinRef = ""
    private var heartbeatTimer: Timer? = null
    private var reconnectAttempts = 0
    private val maxReconnectAttempts = 5
    private val reconnectDelayMs = 3000L
    private var shouldConnect = false

    /**
     * Invoked when the server rejects the connection as unauthorized (expired/invalid token).
     * The owner should refresh the Firebase ID token and call [updateAuthToken].
     */
    var onUnauthorized: (() -> Unit)? = null

    val orderUpdatesLiveData: LiveData<OrderUpdate> = orderUpdates
    val locationUpdatesLiveData: LiveData<LocationUpdate> = locationUpdates
    val chatMessagesLiveData: LiveData<ChatMessage> = chatMessages

    init {
        registerNetworkCallback()
        if (authToken.isNotBlank()) {
            shouldConnect = true
            connect()
        }
    }

    /**
     * Re-connects whenever connectivity comes back (Wi-Fi -> mobile switch, etc.)
     * even after the reconnect budget has been exhausted.
     */
    private fun registerNetworkCallback() {
        val connectivityManager =
            context.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val request = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .build()
        try {
            connectivityManager.registerNetworkCallback(request, object : ConnectivityManager.NetworkCallback() {
                override fun onAvailable(network: Network) {
                    Log.d(TAG, "Network available - checking socket state")
                    if (shouldConnect && !isConnected && reconnectAttempts >= maxReconnectAttempts) {
                        reconnectAttempts = 0
                        connect()
                    }
                }
            })
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register network callback", e)
        }
    }

    private fun connect() {
        if (!shouldConnect || authToken.isBlank()) {
            Log.d(TAG, "Not connecting - shouldConnect=$shouldConnect, token empty=${authToken.isBlank()}")
            return
        }

        try {
            val request = Request.Builder()
                .url(serverUrl)

            webSocket = client.newWebSocket(request.build(), object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    if (this@SocketManager.webSocket !== webSocket) {
                        Log.d(TAG, "Ignoring open from stale socket")
                        return
                    }
                    Log.d(TAG, "Realtime WebSocket connected")
                    isConnected = true
                    reconnectAttempts = 0
                    sendPhoenixJoin()
                    sendChannelJoins()
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    try {
                        val message = JSONObject(text)
                        val event = message.optString("event", "")
                        when (event) {
                            "phx_reply" -> handlePhoenixReply(message)
                            "system" -> {
                                val payload = message.optJSONObject("payload")
                                val status = payload?.optString("status", "") ?: ""
                                val msg = payload?.optString("message", "") ?: ""
                                Log.d(TAG, "Realtime system event: $status - $msg")
                            }
                            "postgres_changes" -> handlePostgresChange(message)
                            else -> Log.d(TAG, "Received unknown Realtime event: $event")
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing WebSocket message: ${text.take(200)}", e)
                    }
                }

                override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                    if (this@SocketManager.webSocket !== webSocket) {
                        Log.d(TAG, "Ignoring close from stale socket")
                        return
                    }
                    Log.d(TAG, "WebSocket closing: $code - $reason")
                    isConnected = false
                    stopHeartbeat()
                    webSocket.close(1000, null)
                    attemptReconnect()
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    if (this@SocketManager.webSocket !== webSocket) {
                        Log.d(TAG, "Ignoring closed from stale socket")
                        return
                    }
                    Log.d(TAG, "WebSocket closed: $code - $reason")
                    isConnected = false
                    stopHeartbeat()
                    attemptReconnect()
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    if (this@SocketManager.webSocket !== webSocket) {
                        Log.d(TAG, "Ignoring failure from stale socket")
                        return
                    }
                    Log.e(TAG, "WebSocket failure", t)
                    isConnected = false
                    stopHeartbeat()
                    attemptReconnect()
                }
            })

        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize WebSocket connection", e)
            attemptReconnect()
        }
    }

    private fun sendPhoenixJoin() {
        val ref = ++refCounter
        webSocket?.send(JSONObject().apply {
            put("topic", "phoenix")
            put("event", "phx_join")
            put("payload", JSONObject())
            put("ref", ref.toString())
        }.toString())
        Log.d(TAG, "Sent Phoenix socket join (ref $ref)")
    }

    private fun sendChannelJoins() {
        ordersJoinRef = (++refCounter).toString()
        webSocket?.send(JSONObject().apply {
            put("topic", CHANNEL_ORDERS)
            put("event", "phx_join")
            put("payload", JSONObject().apply {
                put("config", JSONObject().apply {
                    put("postgres_changes", org.json.JSONArray().put(JSONObject().apply {
                        put("event", "*")
                        put("schema", "public")
                        put("table", "orders")
                    }))
                })
            })
            put("ref", ordersJoinRef)
        }.toString())
        Log.d(TAG, "Sent channel join for $CHANNEL_ORDERS (ref $ordersJoinRef)")

        locationsJoinRef = (++refCounter).toString()
        webSocket?.send(JSONObject().apply {
            put("topic", CHANNEL_LOCATIONS)
            put("event", "phx_join")
            put("payload", JSONObject().apply {
                put("config", JSONObject().apply {
                    put("postgres_changes", org.json.JSONArray().put(JSONObject().apply {
                        put("event", "*")
                        put("schema", "public")
                        put("table", "driver_locations")
                    }))
                })
            })
            put("ref", locationsJoinRef)
        }.toString())
        Log.d(TAG, "Sent channel join for $CHANNEL_LOCATIONS (ref $locationsJoinRef)")
    }

    private fun handlePhoenixReply(message: JSONObject) {
        val ref = message.optString("ref", "")
        val payload = message.optJSONObject("payload")
        val status = payload?.optString("status", "") ?: ""

        if ((ref == ordersJoinRef || ref == locationsJoinRef) && status == "ok") {
            startHeartbeat()
            val ch = if (ref == ordersJoinRef) CHANNEL_ORDERS else CHANNEL_LOCATIONS
            Log.d(TAG, "Channel joined: $ch")
        } else if (status == "error") {
            // The "phoenix" topic replies "unmatched topic" for the socket join and
            // every heartbeat - that is expected, so keep those quiet.
            val topic = message.optString("topic", "")
            if (topic == "phoenix") return
            val reason = payload?.optJSONObject("response")?.optString("reason", "") ?: ""
            Log.e(TAG, "Realtime error on ref $ref: $reason")
        }
    }

    private fun handlePostgresChange(message: JSONObject) {
        val payload = message.optJSONObject("payload")
        val data = payload?.optJSONObject("data") ?: return
        val type = data.optString("type", "")
        val table = data.optString("table", "")

        if (table == "orders") {
            when (type) {
                "INSERT", "UPDATE" -> {
                    val record = data.optJSONObject("record") ?: return
                    val orderId = record.optString("id", "")
                    if (orderId.isEmpty()) return
                    val status = record.optString("status", "")
                    orderUpdates.postValue(OrderUpdate(
                        orderId = orderId,
                        status = status,
                        data = record
                    ))
                    Log.d(TAG, "Received order $type: id=$orderId status=$status")
                }
                "DELETE" -> {
                    val oldRecord = data.optJSONObject("old_record")
                    val orderId = oldRecord?.optString("id", "") ?: ""
                    if (orderId.isNotEmpty()) {
                        orderUpdates.postValue(OrderUpdate(
                            orderId = orderId,
                            status = "deleted",
                            data = JSONObject()
                        ))
                        Log.d(TAG, "Received order DELETE: id=$orderId")
                    }
                }
                else -> Log.d(TAG, "Unhandled orders change type: $type")
            }
        } else if (table == "driver_locations") {
            when (type) {
                "INSERT", "UPDATE" -> {
                    val record = data.optJSONObject("record") ?: return
                    val driverId = record.optString("driver_id", record.optString("driverId", ""))
                    val latitude = record.optDouble("latitude", 0.0)
                    val longitude = record.optDouble("longitude", 0.0)
                    val timestamp = record.optString("timestamp", record.optString("created_at", ""))
                    if (driverId.isNotEmpty()) {
                        locationUpdates.postValue(LocationUpdate(
                            driverId = driverId,
                            latitude = latitude,
                            longitude = longitude,
                            timestamp = timestamp
                        ))
                        Log.d(TAG, "Received driver location $type: driver=$driverId lat=$latitude lng=$longitude")
                    }
                }
                "DELETE" -> Log.d(TAG, "Driver location deleted (ignored)")
                else -> Log.d(TAG, "Unhandled driver_locations change type: $type")
            }
        } else {
            Log.d(TAG, "Postgres change on unhandled table: $table type=$type")
        }
    }

    private fun startHeartbeat() {
        stopHeartbeat()
        heartbeatTimer = Timer("realtime-heartbeat", true).apply {
            schedule(object : TimerTask() {
                override fun run() {
                    val ref = (++refCounter).toString()
                    webSocket?.send(JSONObject().apply {
                        put("topic", "phoenix")
                        put("event", "phx_heartbeat")
                        put("payload", JSONObject())
                        put("ref", ref)
                    }.toString())
                }
            }, HEARTBEAT_INTERVAL_MS, HEARTBEAT_INTERVAL_MS)
        }
    }

    private fun stopHeartbeat() {
        heartbeatTimer?.cancel()
        heartbeatTimer = null
    }

    private fun attemptReconnect() {
        if (reconnectAttempts >= maxReconnectAttempts) {
            Log.e(TAG, "Max reconnect attempts reached")
            return
        }

        reconnectAttempts++
        Log.d(TAG, "Attempting reconnect ($reconnectAttempts/$maxReconnectAttempts) after ${reconnectDelayMs}ms")

        client.dispatcher.executorService.submit {
            try {
                Thread.sleep(reconnectDelayMs * reconnectAttempts) // Exponential-ish backoff
                connect()
            } catch (e: InterruptedException) {
                Thread.currentThread().interrupt()
            }
        }
    }

    fun emitLocationUpdate(latitude: Double, longitude: Double) {
        Log.d(TAG, "emitLocationUpdate ignored: Realtime transport is receive-only")
    }

    fun emitChatMessage(orderId: String, message: String) {
        Log.d(TAG, "emitChatMessage ignored: Realtime transport is receive-only")
    }

    fun emitOrderAccepted(orderId: String) {
        Log.d(TAG, "emitOrderAccepted ignored: Realtime transport is receive-only")
    }

    fun emitStatusUpdate(status: String) {
        Log.d(TAG, "emitStatusUpdate ignored: Realtime transport is receive-only")
    }

    fun disconnect() {
        shouldConnect = false
        reconnectAttempts = maxReconnectAttempts // Prevent reconnection
        stopHeartbeat()
        webSocket?.close(1000, "Driver going offline")
        webSocket = null
        isConnected = false
        Log.d(TAG, "Realtime disconnected")
    }

    fun updateAuthToken(newToken: String) {
        this.authToken = newToken
        if (newToken.isNotBlank()) {
            shouldConnect = true
            reconnectAttempts = 0
            if (!isConnected) {
                connect()
            } else {
                // If already connected, reconnect with new token
                webSocket?.close(1000, "Token updated")
                webSocket = null
                isConnected = false
                connect()
            }
        } else {
            // Token cleared (logout) - disconnect
            disconnect()
        }
    }

    fun isConnected(): Boolean = isConnected

    // Data classes for updates
    data class OrderUpdate(
        val orderId: String,
        val status: String,
        val data: JSONObject
    )

    data class LocationUpdate(
        val driverId: String,
        val latitude: Double,
        val longitude: Double,
        val timestamp: String
    )

    data class ChatMessage(
        val orderId: String,
        val senderId: String,
        val senderName: String,
        val message: String,
        val timestamp: String
    )
}