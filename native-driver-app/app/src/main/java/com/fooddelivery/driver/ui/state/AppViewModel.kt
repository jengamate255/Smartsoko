package com.fooddelivery.driver.ui.state

import android.content.SharedPreferences
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fooddelivery.driver.data.AuthRepository
import com.fooddelivery.driver.data.LocalDatabase
import com.fooddelivery.driver.data.model.Order
import com.fooddelivery.driver.data.model.User
import com.fooddelivery.driver.data.model.ChatMessage
import com.fooddelivery.driver.repository.OrderRepository
import com.fooddelivery.driver.realtime.SocketManager
import com.fooddelivery.driver.util.AppConfig
import com.fooddelivery.driver.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Main ViewModel for the driver application.
 * Manages UI state and business logic.
 */
@HiltViewModel
class AppViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val localDatabase: LocalDatabase,
    private val orderRepository: OrderRepository,
    private val socketManager: SocketManager,
    private val sharedPreferences: SharedPreferences
) : ViewModel() {

    // UI State
    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _user = MutableLiveData<User?>(null)
    val user: LiveData<User?> = _user

    private val _orders = MutableLiveData<List<Order>>(emptyList())
    val orders: LiveData<List<Order>> = _orders

    private val _activeOrder = MutableLiveData<Order?>(null)
    val activeOrder: LiveData<Order?> = _activeOrder

    private val _driverLocation = MutableLiveData<android.location.Location?>(null)
    val driverLocation: LiveData<android.location.Location?> = _driverLocation

    private val _isOnline = MutableLiveData<Boolean>(false)
    val isOnline: LiveData<Boolean> = _isOnline

    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error

    // Chat state
    private val _messages = MutableLiveData<List<ChatMessage>>(emptyList())
    val messages: LiveData<List<ChatMessage>> = _messages

    // Flags to prevent duplicate initialization
    private var socketInitialized = false
    private var locationInitialized = false

    init {
        // Initialize components
        initializeApp()
    }

    private fun initializeApp() {
        // Load saved session
        loadSavedSession()

        // Start location tracking
        startLocationTracking()
    }

    private fun loadSavedSession() {
        viewModelScope.launch {
            _isLoading.value = true

            // Retrieve saved token from SharedPreferences
            val savedToken = sharedPreferences.getString("firebase_auth_token", null)
            val savedEmail = sharedPreferences.getString("user_email", null)
            val savedName = sharedPreferences.getString("user_name", null)

            if (savedToken != null && savedEmail != null) {
                // Restore previous session
                val restoredUser = User(
                    id = savedEmail.substringBefore('@'),
                    email = savedEmail,
                    fullName = savedName ?: savedEmail,
                    role = "driver",
                    phone = ""
                )
                _user.value = restoredUser

                // Update socket auth and reconnect
                socketManager.disconnect()
                _isLoading.value = false
                initializeSocket()
            } else {
                // No saved session, show login screen
                _isLoading.value = false
            }
        }
    }

    private fun initializeSocket() {
        if (socketInitialized) return

        // Listen to order updates from socket
        socketManager.orderUpdatesLiveData.observeForever { update ->
            viewModelScope.launch {
                val currentOrders = _orders.value ?: emptyList()
                val existingIndex = currentOrders.indexOfFirst { it.id == update.orderId }

                if (existingIndex >= 0) {
                    // Update existing order
                    val updatedOrders = currentOrders.toMutableList()
                    updatedOrders[existingIndex] = currentOrders[existingIndex].copy(
                        status = update.status
                    )
                    _orders.value = updatedOrders
                } else {
                    // Add new order from update
                    val newOrder = Order(
                        id = update.orderId,
                        restaurantName = update.data.optString("restaurantName", "Unknown"),
                        restaurantAddress = update.data.optString("restaurantAddress", ""),
                        restaurantLocation = com.fooddelivery.driver.data.model.LocationData(
                            update.data.optJSONObject("restaurantLocation")?.optDouble("lat", 0.0) ?: 0.0,
                            update.data.optJSONObject("restaurantLocation")?.optDouble("lng", 0.0) ?: 0.0
                        ),
                        customerName = update.data.optString("customerName", ""),
                        customerAddress = update.data.optString("customerAddress", ""),
                        customerLocation = com.fooddelivery.driver.data.model.LocationData(
                            update.data.optJSONObject("customerLocation")?.optDouble("lat", 0.0) ?: 0.0,
                            update.data.optJSONObject("customerLocation")?.optDouble("lng", 0.0) ?: 0.0
                        ),
                        items = parseItemsFromJson(update.data.optJSONArray("items")),
                        totalAmount = update.data.optDouble("totalAmount", 0.0),
                        status = update.status,
                        createdAt = update.data.optString("createdAt", ""),
                        updatedAt = update.data.optString("updatedAt", "")
                    )
                    _orders.value = currentOrders + newOrder
                }
            }
        }

        // Listen to location updates
        socketManager.locationUpdatesLiveData.observeForever { locationUpdate ->
            val location = android.location.Location("").apply {
                latitude = locationUpdate.latitude
                longitude = locationUpdate.longitude
            }
            _driverLocation.value = location
        }

        // Listen to chat messages
        socketManager.chatMessagesLiveData.observeForever { message ->
            viewModelScope.launch {
                val currentMessages = _messages.value ?: emptyList()
                _messages.value = currentMessages + message
            }
        }

        socketInitialized = true
    }

    private fun parseItemsFromJson(itemsArray: org.json.JSONArray?): List<com.fooddelivery.driver.data.model.OrderItem> {
        if (itemsArray == null) return emptyList()
        val items = mutableListOf<com.fooddelivery.driver.data.model.OrderItem>()
        for (i in 0 until itemsArray.length()) {
            val item = itemsArray.optJSONObject(i) ?: continue
            items.add(
                com.fooddelivery.driver.data.model.OrderItem(
                    name = item.optString("name", ""),
                    quantity = item.optInt("quantity", 1),
                    price = item.optDouble("price", 0.0),
                    specialInstructions = item.optString("specialInstructions", null)
                )
            )
        }
        return items
    }

    private fun startLocationTracking() {
        if (locationInitialized) return
        // TODO: Implement actual location tracking using FusedLocationProviderClient
        viewModelScope.launch {
            while (true) {
                delay(5000)
                val location = android.location.Location("gps").apply {
                    latitude = -1.2921 + (Math.random() * 0.01) // Nairobi area (replace with actual GPS)
                    longitude = 36.8219 + (Math.random() * 0.01)
                }
                _driverLocation.value = location

                // Also emit location to server if connected
                if (socketManager.isConnected()) {
                    socketManager.emitLocationUpdate(location.latitude, location.longitude)
                }
            }
        }
        locationInitialized = true
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = authRepository.signIn(email, password)
            when (result) {
                is Result.Success -> {
                    val user = result.getOrNull() ?: return@launch
                    _user.value = user

                    // Save session to SharedPreferences
                    sharedPreferences.edit()
                        .putString("firebase_auth_token", result.tokenOrNull())
                        .putString("user_email", email)
                        .putString("user_name", user.fullName)
                        .apply()

                    // Reconnect socket with new auth token
                    socketManager.disconnect()
                    initializeSocket()
                }
                is Result.Error -> {
                    _error.value = result.exceptionOrNull()?.message
                }
            }
            _isLoading.value = false
        }
    }

    fun signOut() {
        _user.value = null
        _orders.value = emptyList()
        _activeOrder.value = null
        _messages.value = emptyList()

        // Clear session from SharedPreferences
        sharedPreferences.edit().clear().apply()

        // Disconnect socket
        socketManager.disconnect()
        socketInitialized = false
    }

    fun acceptOrder(orderId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val authToken = sharedPreferences.getString("firebase_auth_token", "") ?: ""
                val response = orderRepository.acceptOrder(authToken, orderId)

                when (response) {
                    is Result.Success -> {
                        val orderResponse = response.getOrNull()
                        if (orderResponse?.success == true) {
                            val currentOrders = _orders.value ?: emptyList()
                            val updatedOrders = currentOrders.map { order ->
                                if (order.id == orderId) {
                                    order.copy(status = "accepted")
                                } else {
                                    order
                                }
                            }
                            _orders.value = updatedOrders

                            val acceptedOrder = updatedOrders.firstOrNull { it.id == orderId }
                            _activeOrder.value = acceptedOrder

                            // Emit acceptance via WebSocket
                            socketManager.emitOrderAccepted(orderId)
                        } else {
                            _error.value = orderResponse?.message ?: "Failed to accept order"
                        }
                    }
                    is Result.Error -> {
                        _error.value = response.exceptionOrNull()?.message ?: "Network error"
                    }
                }
            } catch (e: Exception) {
                _error.value = "Error accepting order: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateOrderStatus(orderId: String, newStatus: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val authToken = sharedPreferences.getString("firebase_auth_token", "") ?: ""
                // TODO: Call API to update status on server
                // For now: local-only update

                val currentOrders = _orders.value ?: emptyList()
                val updatedOrders = currentOrders.map { order ->
                    if (order.id == orderId) order.copy(
                        status = newStatus,
                        updatedAt = java.time.Instant.now().toString()
                    ) else order
                }
                _orders.value = updatedOrders

                if (_activeOrder.value?.id == orderId) {
                    _activeOrder.value = _activeOrder.value?.copy(
                        status = newStatus,
                        updatedAt = java.time.Instant.now().toString()
                    )
                }
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun sendChatMessage(orderId: String, message: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                socketManager.emitChatMessage(orderId, message)

                // Add locally immediately (optimistic)
                val currentMessages = _messages.value ?: emptyList()
                val driverName = _user.value?.fullName ?: "Driver"
                val newMessage = ChatMessage(
                    orderId = orderId,
                    senderId = _user.value?.id ?: "unknown",
                    senderName = driverName,
                    message = message,
                    timestamp = java.time.Instant.now().toString()
                )
                _messages.value = currentMessages + newMessage
            } catch (e: Exception) {
                _error.value = "Failed to send message: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun getPastOrders(): List<Order> {
        // TODO: Get past orders from local database
        return emptyList()
    }

    override fun onCleared() {
        super.onCleared()
        socketManager.orderUpdatesLiveData.removeObservers { }
        socketManager.locationUpdatesLiveData.removeObservers { }
    }

    // Helper to extract token from Result if possible
    private fun Result<*>.tokenOrNull(): String? {
        return try {
            val r = this as? Result.Success<*>
            // SupabaseClient.signIn returns a Map with "token" key
            if (r != null) {
                @Suppress("UNCHECKED_CAST")
                (r.getOrNull() as? Map<String, String>)?.get("token")
            } else null
        } catch (_: Exception) {
            null
        }
    }
}

    private fun initializeApp() {
        // Check if we have a saved session
        loadSavedSession()
        
        // Start location updates
        startLocationTracking()
        
        // Initialize socket connection if we have auth
        if (_user.value != null) {
            initializeSocket()
        }
    }

    private fun loadSavedSession() {
        viewModelScope.launch {
            // TODO: Load saved session from DataStore or SharedPreferences
            // For now, we'll simulate a login
            // In a real app, you would retrieve the saved user token and refresh if needed
            _isLoading.value = true
            
            // Simulate loading user data
            // Replace this with actual session restoration
            val testUser = User(
                id = "driver_123",
                email = "driver@example.com",
                fullName = "John Driver",
                role = "driver",
                phone = "+1234567890"
            )
            _user.value = testUser
            
            // Initialize socket with auth token
            initializeSocket()
            
            _isLoading.value = false
        }
    }

    private fun initializeSocket() {
        if (socketInitialized) return
        
        // Use configuration values
        val socketUrl = AppConfig.WEBSOCKET_URL
        val authToken = "firebase-test-token" // Replace with actual auth token from Firebase
        
        // Update the socket manager with new URL and token
        // In a real implementation, you would recreate the SocketManager
        // For now, we assume it's already configured
        
        // Listen to order updates from socket
        socketManager.orderUpdatesLiveData.observeForever { update ->
            // When we receive an order update, we add it to our list
            // For simplicity, we're just adding new orders
            // In a real app, you would update existing orders or handle different update types
            viewModelScope.launch {
                val currentOrders = _orders.value ?: emptyList()
                // Check if we already have this order
                val orderExists = currentOrders.any { it.id == update.orderId }
                if (!orderExists) {
                    // Create a basic order from the update data
                    // In a real app, you would parse the update data more thoroughly
                    val newOrder = Order(
                        id = update.orderId,
                        restaurantName = "Restaurant from update",
                        restaurantAddress = "123 Restaurant St",
                        restaurantLocation = com.fooddelivery.driver.data.model.LocationData(0.0, 0.0),
                        customerName = "Customer",
                        customerAddress = "456 Customer Ave",
                        customerLocation = com.fooddelivery.driver.data.model.LocationData(0.0, 0.0),
                        items = emptyList(),
                        totalAmount = 0.0,
                        status = update.status,
                        createdAt = "",
                        updatedAt = ""
                    )
                    _orders.value = currentOrders + newOrder
                }
            }
        }
        
        // Listen to location updates (for tracking our own location)
        socketManager.locationUpdatesLiveData.observeForever { locationUpdate ->
            // Update our driver location
            val location = android.location.Location("").apply {
                latitude = locationUpdate.latitude
                longitude = locationUpdate.longitude
            }
            _driverLocation.value = location
        }
        
        // Listen to chat messages from socket
        socketManager.chatMessagesLiveData.observeForever { message ->
            // When we receive a chat message, we add it to our list
            viewModelScope.launch {
                val currentMessages = _messages.value ?: emptyList()
                _messages.value = currentMessages + message
                // Scroll to bottom would be handled in the UI
            }
        }
        
        socketInitialized = true
    }

    private fun startLocationTracking() {
        if (locationInitialized) return
        // TODO: Implement actual location tracking using FusedLocationProviderClient
        // For now, we'll simulate location updates
        viewModelScope.launch {
            while (true) {
                delay(5000) // Update every 5 seconds
                // Simulate location update
                val location = android.location.Location("gps").apply {
                    latitude = -1.2921 + (Math.random() * 0.01) // Nairobi area
                    longitude = 36.8219 + (Math.random() * 0.01)
                }
                _driverLocation.value = location
            }
        }
        locationInitialized = true
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = authRepository.signIn(email, password)
            when (result) {
                is Result.Success -> {
                    val user = result.getOrNull() ?: return@launch
                    _user.value = user
                    // Save session
                    // TODO: Save session to DataStore
                    // Initialize socket with new auth token
                    initializeSocket()
                }
                is Result.Error -> {
                    _error.value = result.exceptionOrNull()?.message
                }
            }
            _isLoading.value = false
        }
    }

    fun signOut() {
        _user.value = null
        _orders.value = emptyList()
        _activeOrder.value = null
        // Clear session
        // TODO: Clear saved session
        // Disconnect socket
        socketManager.orderUpdatesLiveData.removeObservers { }
        socketManager.locationUpdatesLiveData.removeObservers { }
    }

    fun acceptOrder(orderId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            // Implement actual order acceptance via API
            try {
                // Get auth token from saved session or Firebase
                val authToken = "firebase-test-token" // In real app, get from secure storage
                
                // Call API to accept order
                val response = orderRepository.acceptOrder(authToken, orderId)
                
                when (response) {
                    is Result.Success -> {
                        val orderResponse = response.getOrNull()
                        if (orderResponse?.success == true) {
                            // Update the order status locally
                            val currentOrders = _orders.value ?: emptyList()
                            val updatedOrders = currentOrders.map { order ->
                                if (order.id == orderId) {
                                    Order(
                                        id = order.id,
                                        restaurantName = order.restaurantName,
                                        restaurantAddress = order.restaurantAddress,
                                        restaurantLocation = order.restaurantLocation,
                                        customerName = order.customerName,
                                        customerAddress = order.customerAddress,
                                        customerLocation = order.customerLocation,
                                        items = order.items,
                                        totalAmount = order.totalAmount,
                                        status = "accepted",
                                        createdAt = order.createdAt,
                                        updatedAt = java.time.Instant.now().toString()
                                    )
                                } else {
                                    order
                                }
                            }
                            _orders.value = updatedOrders
                            
                            // Set as active order
                            val acceptedOrder = updatedOrders.firstOrNull { it.id == orderId }
                            _activeOrder.value = acceptedOrder
                            
                            // Emit acceptance via WebSocket (if needed for real-time updates to others)
                            socketManager.emitOrderAccepted(orderId)
                        } else {
                            _error.value = orderResponse?.message ?: "Failed to accept order"
                        }
                    }
                    is Result.Error -> {
                        _error.value = response.exceptionOrNull()?.message ?: "Network error"
                    }
                }
            } catch (e: Exception) {
                _error.value = "Error accepting order: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    fun updateOrderStatus(orderId: String, newStatus: String) {
        viewModelScope.launch {
            _isLoading.value = true
            // TODO: Implement actual status update via API or WebSocket
            delay(1000)
            
            // Update the order status locally
            val currentOrders = _orders.value ?: emptyList()
            val updatedOrders = currentOrders.map { order ->
                if (order.id == orderId) {
                    Order(
                        id = order.id,
                        restaurantName = order.restaurantName,
                        restaurantAddress = order.restaurantAddress,
                        restaurantLocation = order.restaurantLocation,
                        customerName = order.customerName,
                        customerAddress = order.customerAddress,
                        customerLocation = order.customerLocation,
                        items = order.items,
                        totalAmount = order.totalAmount,
                        status = newStatus,
                        createdAt = order.createdAt,
                        updatedAt = java.time.Instant.now().toString()
                    )
                } else {
                    order
                }
            }
            _orders.value = updatedOrders
            
            // If this was the active order, update it too
            if (_activeOrder.value?.id == orderId) {
                _activeOrder.value = _activeOrder.value?.copy(
                    status = newStatus,
                    updatedAt = java.time.Instant.now().toString()
                )
            }
            
            _isLoading.value = false
        }
    }

    fun sendChatMessage(orderId: String, message: String) {
        viewModelScope.launch {
            _isLoading.value = true
            // TODO: Implement actual chat message sending via WebSocket
            delay(500)
            
            // Emit the chat message via socket
            // socketManager.emitChatMessage(orderId, message)
            
            // For now, we'll simulate by adding the message to our local list
            val currentMessages = _messages.value ?: emptyList()
            val newMessage = ChatMessage(
                orderId = orderId,
                senderId = "driver_123", // In real app, get from current user
                senderName = "Driver",
                message = message,
                timestamp = java.time.Instant.now().toString()
            )
            _messages.value = currentMessages + newMessage
            
            _isLoading.value = false
        }
    }

    fun getPastOrders(): List<Order> {
        // TODO: Get past orders from local database
        // For now, return empty list
        return emptyList()
    }

    override fun onCleared() {
        super.onCleared()
        // Clean up resources
        socketManager.orderUpdatesLiveData.removeObservers { }
        socketManager.locationUpdatesLiveData.removeObservers { }
    }
}