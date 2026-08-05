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
import java.util.concurrent.TimeUnit

/**
 * Manages the native WebSocket connection for real-time updates.
 * Compatible with the server's ws:// protocol (not Socket.IO).
 */
class SocketManager(
    private val context: Context,
    private val serverUrl: String,
    private var authToken: String = ""
) {

    companion object {
        private const val TAG = "SocketManager"
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
    private val messageQueue = mutableListOf<JSONObject>()
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
            val requestBuilder = Request.Builder()
                .url("$serverUrl/ws?token=$authToken")

            webSocket = client.newWebSocket(requestBuilder.build(), object : WebSocketListener() {
                override fun onOpen(webSocket: WebSocket, response: Response) {
                    Log.d(TAG, "WebSocket connected")
                    isConnected = true
                    reconnectAttempts = 0

                    // Send any queued messages
                    synchronized(messageQueue) {
                        messageQueue.forEach { msg ->
                            webSocket.send(msg.toString())
                        }
                        messageQueue.clear()
                    }
                }

                override fun onMessage(webSocket: WebSocket, text: String) {
                    try {
                        val data = JSONObject(text)
                        val type = data.optString("type", "")

                        when (type) {
                            "order_update", "order_update_driver" -> {
                                val orderId = data.optString("orderId", data.optJSONObject("data")?.optString("orderId", "") ?: "")
                                val status = data.optString("status", data.optJSONObject("data")?.optString("status", "") ?: "")
                                orderUpdates.postValue(OrderUpdate(
                                    orderId = orderId,
                                    status = status,
                                    data = data.optJSONObject("data") ?: data
                                ))
                            }

                            "location_update" -> {
                                val locationData = data.optJSONObject("data") ?: data
                                locationUpdates.postValue(LocationUpdate(
                                    driverId = locationData.optString("driverId", ""),
                                    latitude = locationData.optDouble("latitude", 0.0),
                                    longitude = locationData.optDouble("longitude", 0.0),
                                    timestamp = locationData.optString("timestamp", "")
                                ))
                            }

                            "chat_message" -> {
                                val chatData = data.optJSONObject("data") ?: data
                                chatMessages.postValue(ChatMessage(
                                    orderId = chatData.optString("orderId", ""),
                                    senderId = chatData.optString("senderId", ""),
                                    senderName = chatData.optString("senderName", ""),
                                    message = chatData.optString("message", ""),
                                    timestamp = chatData.optString("timestamp", "")
                                ))
                            }

                            "order_accepted" -> {
                                val orderData = data.optJSONObject("data") ?: data
                                val orderId = orderData.optString("orderId", orderData.optString("id", ""))
                                val status = orderData.optString("status", "accepted")
                                orderUpdates.postValue(OrderUpdate(
                                    orderId = orderId,
                                    status = status,
                                    data = orderData
                                ))
                            }

                            "rider_locations" -> {
                                // Fleet location broadcast - can be used for tracking nearby drivers
                                Log.d(TAG, "Received rider locations update")
                            }

                            "initial_data" -> {
                                Log.d(TAG, "Received initial data from server")
                            }

                            "error" -> {
                                val errorMsg = data.optString("error", "Unknown error")
                                Log.e(TAG, "Server error: $errorMsg")
                                if (errorMsg.contains("Unauthorized", ignoreCase = true) || errorMsg.contains("Forbidden", ignoreCase = true)) {
                                    // Token invalid - stop auto-reconnecting and let the owner refresh the token
                                    shouldConnect = false
                                    reconnectAttempts = maxReconnectAttempts
                                    onUnauthorized?.invoke()
                                }
                            }

                            else -> {
                                Log.d(TAG, "Received unknown message type: $type")
                            }
                        }
                    } catch (e: Exception) {
                        Log.e(TAG, "Error parsing WebSocket message: ${text.take(200)}", e)
                    }
                }

                override fun onClosing(webSocket: WebSocket, code: Int, reason: String) {
                    Log.d(TAG, "WebSocket closing: $code - $reason")
                    isConnected = false
                    webSocket.close(1000, null)
                    attemptReconnect()
                }

                override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                    Log.d(TAG, "WebSocket closed: $code - $reason")
                    isConnected = false
                    attemptReconnect()
                }

                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    Log.e(TAG, "WebSocket failure", t)
                    isConnected = false
                    attemptReconnect()
                }
            })

        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize WebSocket connection", e)
            attemptReconnect()
        }
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

    /**
     * Send a message via WebSocket. Queues if not connected.
     */
    private fun sendMessage(message: JSONObject) {
        synchronized(messageQueue) {
            if (isConnected) {
                try {
                    val sent = webSocket?.send(message.toString()) ?: false
                    if (!sent) {
                        messageQueue.add(message)
                    } else {
                        // sent successfully
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to send message", e)
                    messageQueue.add(message)
                }
            } else {
                messageQueue.add(message)
            }
        }
    }

    fun emitLocationUpdate(latitude: Double, longitude: Double) {
        val msg = JSONObject().apply {
            put("type", "driver_location_update")
            put("driverId", "driver_${authToken.take(8)}")
            put("latitude", latitude)
            put("longitude", longitude)
            put("timestamp", System.currentTimeMillis())
        }
        sendMessage(msg)
        Log.d(TAG, "Sent location update: lat=$latitude, lng=$longitude")
    }

    fun emitChatMessage(orderId: String, message: String) {
        val msg = JSONObject().apply {
            put("type", "send_chat_message")
            put("orderId", orderId)
            put("message", message)
            put("timestamp", System.currentTimeMillis())
        }
        sendMessage(msg)
        Log.d(TAG, "Sent chat message for order: $orderId")
    }

    fun emitOrderAccepted(orderId: String) {
        val msg = JSONObject().apply {
            put("type", "order_accepted")
            put("orderId", orderId)
            put("timestamp", System.currentTimeMillis())
        }
        sendMessage(msg)
        Log.d(TAG, "Sent order accepted for: $orderId")
    }

    fun emitStatusUpdate(status: String) {
        val msg = JSONObject().apply {
            put("type", "driver_status_update")
            put("status", status)
            put("timestamp", System.currentTimeMillis())
        }
        sendMessage(msg)
        Log.d(TAG, "Sent status update: $status")
    }

    fun disconnect() {
        shouldConnect = false
        reconnectAttempts = maxReconnectAttempts // Prevent reconnection
        webSocket?.close(1000, "Driver going offline")
        webSocket = null
        isConnected = false
        synchronized(messageQueue) {
            messageQueue.clear()
        }
        Log.d(TAG, "WebSocket disconnected")
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