package com.fooddelivery.driver.ui.state

import android.content.Context
import android.content.SharedPreferences
import android.location.Location as AndroidLocation
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fooddelivery.driver.data.AuthRepository
import com.fooddelivery.driver.data.LocalDatabase
import com.fooddelivery.driver.data.model.Order
import com.fooddelivery.driver.data.model.User
import com.smartsoko.driver.domain.model.Location as DomainLocation
import com.smartsoko.driver.service.LocationTrackingService
import com.smartsoko.driver.service.LocationState
import com.fooddelivery.driver.realtime.SocketManager
import com.fooddelivery.driver.repository.OrderRepository
import com.smartsoko.driver.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.collectLatest
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
    private val sharedPreferences: SharedPreferences,
    @ApplicationContext private val context: Context,
    private val locationState: LocationState
) : ViewModel() {

    // UI State
    private val _isLoading = MutableLiveData<Boolean>(false)
    val isLoading: LiveData<Boolean> = _isLoading

    private val _user = MutableLiveData<User?>(null)
    val user: LiveData<User?> = _user

    private val _orders = MutableLiveData<List<Order>>(emptyList())
    val orders: LiveData<List<Order>> = _orders

    private val _pastOrders = MutableLiveData<List<Order>>(emptyList())
    val pastOrders: LiveData<List<Order>> = _pastOrders

    private val _activeOrder = MutableLiveData<Order?>(null)
    val activeOrder: LiveData<Order?> = _activeOrder

    private val _driverLocation = MutableLiveData<android.location.Location?>(null)
    val driverLocation: LiveData<android.location.Location?> = _driverLocation

    private val _isOnline = MutableLiveData<Boolean>(false)
    val isOnline: LiveData<Boolean> = _isOnline

    private val _error = MutableLiveData<String?>(null)
    val error: LiveData<String?> = _error

    private val _earnings = MutableLiveData<Double>(0.0)
    val earnings: LiveData<Double> = _earnings

    // Chat state
    private val _messages = MutableLiveData<List<SocketManager.ChatMessage>>(emptyList())
    val messages: LiveData<List<SocketManager.ChatMessage>> = _messages

    // Observer references for cleanup
    private val orderUpdateObserver: (SocketManager.OrderUpdate) -> Unit = { update ->
        viewModelScope.launch {
            val currentOrders = _orders.value ?: emptyList()
            val existingIndex = currentOrders.indexOfFirst { it.id == update.orderId }

            if (existingIndex >= 0 && update.status != "deleted") {
                // Fast path: we already know this order - just refresh its status.
                // The Realtime record carries the fresh status even for statuses that
                // leave the "available" pool (accepted, picked_up, ...).
                val updatedOrders = currentOrders.toMutableList()
                updatedOrders[existingIndex] = currentOrders[existingIndex].copy(
                    status = update.status,
                    updatedAt = update.data.optString("updated_at").ifEmpty {
                        currentOrders[existingIndex].updatedAt
                    }
                )
                _orders.value = updatedOrders
            } else if (update.status == "deleted") {
                // The order row was deleted upstream - drop the card from the list.
                _orders.value = currentOrders.filterNot { it.id == update.orderId }
            } else {
                // Unknown order - it just entered the system. Refetch the available
                // list from the API so we get the enriched payload (restaurant name,
                // joined location, items, totals) instead of the raw DB row.
                loadAvailableOrders()
            }
        }
    }

    private val locationUpdateObserver: (SocketManager.LocationUpdate) -> Unit = { locationUpdate ->
        val location = android.location.Location("").apply {
            latitude = locationUpdate.latitude
            longitude = locationUpdate.longitude
        }
        _driverLocation.value = location
    }

    private val chatMessageObserver: (SocketManager.ChatMessage) -> Unit = { message ->
        viewModelScope.launch {
            val currentMessages = _messages.value ?: emptyList()
            _messages.value = currentMessages + message
        }
    }

    // Flags to prevent duplicate initialization
    private var socketInitialized = false
    private var lastTokenRefreshAt = 0L

    init {
        // When the server rejects our token, refresh it via Firebase and reconnect
        socketManager.onUnauthorized = {
            viewModelScope.launch { refreshFirebaseToken() }
        }

        // Single source of location truth: the foreground DriverLocationService
        // (running while online) feeds LocationState, which we forward to UI + server.
        viewModelScope.launch {
            locationState.location.collectLatest { location ->
                if (location != null) {
                    val androidLoc = AndroidLocation("driver").apply {
                        latitude = location.lat
                        longitude = location.lng
                        if (location.bearing != 0f) bearing = location.bearing
                        if (location.speed != 0f) speed = location.speed
                        if (location.accuracy != 0f) accuracy = location.accuracy
                        time = location.timestamp
                    }
                    _driverLocation.value = androidLoc
                    if (socketManager.isConnected()) {
                        socketManager.emitLocationUpdate(location.lat, location.lng)
                    }
                }
            }
        }

        // Initialize components
        initializeApp()
    }

    private fun initializeApp() {
        // Load saved session
        loadSavedSession()
    }

    private suspend fun refreshFirebaseToken() {
        // Guard against refresh loops when the token is genuinely rejected
        val now = System.currentTimeMillis()
        if (now - lastTokenRefreshAt < 30_000) {
            _error.value = "Session expired. Please sign in again."
            return
        }
        lastTokenRefreshAt = now
        try {
            val freshToken = authRepository.getFirebaseToken()
            sharedPreferences.edit()
                .putString("firebase_auth_token", freshToken)
                .apply()
            socketManager.updateAuthToken(freshToken)
        } catch (e: Exception) {
            _error.value = "Session expired. Please sign in again."
        }
    }

    private fun startDriverLocationService() {
        try {
            LocationTrackingService.start(context)
        } catch (e: Exception) {
            _error.value = "Failed to start location tracking: ${e.message}"
        }
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

                // Use a fresh Firebase ID token when available (saved tokens expire after ~1 hour)
                val freshToken = try {
                    authRepository.getFirebaseToken()
                } catch (e: Exception) {
                    savedToken
                }

                if (freshToken != savedToken) {
                    sharedPreferences.edit()
                        .putString("firebase_auth_token", freshToken)
                        .apply()
                }

                // Update socket auth with real token and reconnect
                socketManager.updateAuthToken(freshToken)
                _isLoading.value = false
                initializeSocket()

                // Restore the online/offline status so the driver stays reachable
                if (sharedPreferences.getBoolean("driver_online", false)) {
                    _isOnline.value = true
                    startDriverLocationService()
                    socketManager.emitStatusUpdate("online")
                }

                // Load past orders and earnings
                loadPastOrders()
                loadEarnings()
            } else {
                // No saved session, show login screen
                _isLoading.value = false
            }
        }
    }

    private fun initializeSocket() {
        if (socketInitialized) return

        socketManager.orderUpdatesLiveData.observeForever(orderUpdateObserver)
        socketManager.locationUpdatesLiveData.observeForever(locationUpdateObserver)
        socketManager.chatMessagesLiveData.observeForever(chatMessageObserver)

        socketInitialized = true
    }

    private fun loadPastOrders() {
        viewModelScope.launch {
            val pastOrders = orderRepository.getPastOrders()
            _pastOrders.value = pastOrders.map { it.toOrder() }
        }
    }

    private fun loadEarnings() {
        viewModelScope.launch {
            val earnings = orderRepository.getEarnings()
            _earnings.value = earnings
        }
    }

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = authRepository.signIn(email, password)
            result.fold(
                onSuccess = { user ->
                    _user.value = user

                    // Get real Firebase ID token
                    val firebaseToken = authRepository.getFirebaseToken()

                    // Save session to SharedPreferences
                    sharedPreferences.edit()
                        .putString("firebase_auth_token", firebaseToken)
                        .putString("user_email", email)
                        .putString("user_name", user.fullName)
                        .apply()

                    // Update socket with new auth token
                    socketManager.updateAuthToken(firebaseToken)
                },
                onFailure = { exception ->
                    _error.value = exception.message
                }
            )
            _isLoading.value = false
        }
    }

    fun signUp(email: String, password: String, name: String) {
        viewModelScope.launch {
            _isLoading.value = true
            val result = authRepository.signUp(email, password, name)
            result.fold(
                onSuccess = { user ->
                    _user.value = user

                    val firebaseToken = authRepository.getFirebaseToken()
                    sharedPreferences.edit()
                        .putString("firebase_auth_token", firebaseToken)
                        .putString("user_email", email)
                        .putString("user_name", user.fullName)
                        .apply()

                    socketManager.updateAuthToken(firebaseToken)
                },
                onFailure = { exception ->
                    _error.value = exception.message
                }
            )
            _isLoading.value = false
        }
    }

    fun clearError() {
        _error.value = null
    }

    fun signOut() {        _user.value = null
        _orders.value = emptyList()
        _pastOrders.value = emptyList()
        _activeOrder.value = null
        _messages.value = emptyList()
        _isOnline.value = false

        // Clear session from SharedPreferences
        sharedPreferences.edit().clear().apply()

        // Stop location tracking and disconnect socket
        LocationTrackingService.stop(context)
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
                    is Resource.Success -> {
                        val orderResponse = response.data
                        if (orderResponse?.success == true) {
                            val serverStatus = orderResponse.order?.status ?: "assigned"
                            val currentOrders = _orders.value ?: emptyList()
                            val updatedOrders = currentOrders.map { order ->
                                if (order.id == orderId) {
                                    order.copy(status = serverStatus)
                                } else {
                                    order
                                }
                            }
                            _orders.value = updatedOrders

                            val acceptedOrder = updatedOrders.firstOrNull { it.id == orderId }
                            _activeOrder.value = acceptedOrder

                            if (acceptedOrder != null) {
                                orderRepository.saveOrderLocally(acceptedOrder)
                            }

                            // Emit acceptance via WebSocket
                            socketManager.emitOrderAccepted(orderId)
                        } else {
                            _error.value = orderResponse?.message ?: "Failed to accept order"
                        }
                    }
                    is Resource.Error -> {
                        _error.value = response.message ?: "Network error"
                    }
                    else -> {}
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
                val response = orderRepository.updateOrderStatus(authToken, orderId, newStatus)
                when (response) {
                    is Resource.Success -> {
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

                        val updatedOrder = updatedOrders.firstOrNull { it.id == orderId }
                            ?: _activeOrder.value?.takeIf { it.id == orderId }
                        if (updatedOrder != null) {
                            orderRepository.saveOrderLocally(updatedOrder)
                            if (newStatus in listOf("delivered", "completed", "cancelled")) {
                                loadPastOrders()
                                loadEarnings()
                            }
                        }
                    }
                    is Resource.Error -> _error.value = response.message ?: "Failed to update status"
                    else -> {}
                }
            } catch (e: Exception) {
                _error.value = "Error updating status: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    /**
     * Fetches available orders from the backend and merges them into the order list.
     */
    fun loadAvailableOrders() {
        viewModelScope.launch {
            val authToken = sharedPreferences.getString("firebase_auth_token", "") ?: ""
            if (authToken.isEmpty()) return@launch
            val response = orderRepository.getAvailableOrders(authToken)
            when (response) {
                is Resource.Success -> {
                    val fetched = response.data
                    val currentOrders = _orders.value ?: emptyList()
                    val knownIds = currentOrders.map { it.id }.toSet()
                    val newOrders = fetched.mapNotNull { netOrder ->
                        if (knownIds.contains(netOrder.id)) return@mapNotNull null
                        networkOrderToModel(netOrder)
                    }
                    if (newOrders.isNotEmpty()) {
                        _orders.value = currentOrders + newOrders
                    }
                }
                is Resource.Error -> _error.value = response.message ?: "Failed to load orders"
                else -> {}
            }
        }
    }

    /**
     * Fetches a single order by ID (deep links / order detail) into activeOrder.
     */
    fun fetchOrderById(orderId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                val authToken = sharedPreferences.getString("firebase_auth_token", "") ?: ""
                if (authToken.isEmpty()) return@launch
                val response = orderRepository.getOrderById(authToken, orderId)
                when (response) {
                    is Resource.Success -> {
                        val model = networkOrderToModel(response.data)
                        _activeOrder.value = model
                        val currentOrders = _orders.value ?: emptyList()
                        _orders.value = currentOrders.map { order ->
                            if (order.id == orderId) model else order
                        }
                    }
                    is Resource.Error -> _error.value = response.message ?: "Failed to load order"
                    else -> {}
                }
            } catch (e: Exception) {
                _error.value = "Error loading order: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    private fun networkOrderToModel(netOrder: com.fooddelivery.driver.network.Order): Order {
        return Order(
            id = netOrder.id,
            restaurantName = netOrder.restaurantName,
            restaurantAddress = netOrder.restaurantAddress,
            restaurantLocation = com.fooddelivery.driver.data.model.LocationData(
                netOrder.restaurantLat ?: 0.0,
                netOrder.restaurantLng ?: 0.0
            ),
            customerName = netOrder.customerName,
            customerAddress = netOrder.customerAddress,
            customerLocation = com.fooddelivery.driver.data.model.LocationData(
                netOrder.customerLat,
                netOrder.customerLng
            ),
            items = netOrder.items.map {
                com.fooddelivery.driver.data.model.OrderItem(
                    name = it.name,
                    quantity = it.quantity,
                    price = it.price,
                    notes = it.notes
                )
            },
            totalAmount = netOrder.totalAmount,
            status = netOrder.status,
            createdAt = netOrder.createdAt,
            updatedAt = netOrder.updatedAt,
            deliveryInstructions = netOrder.deliveryInstructions
        )
    }

    fun sendChatMessage(orderId: String, message: String) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                socketManager.emitChatMessage(orderId, message)

                // Add locally immediately (optimistic)
                val currentMessages = _messages.value ?: emptyList()
                val driverName = _user.value?.fullName ?: "Driver"
                val newMessage = SocketManager.ChatMessage(
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

    fun toggleOnlineStatus(isOnline: Boolean) {
        viewModelScope.launch {
            _isLoading.value = true
            try {
                _isOnline.value = isOnline
                // Persist so the status survives app restarts
                sharedPreferences.edit()
                    .putBoolean("driver_online", isOnline)
                    .apply()

                // Foreground location tracking only while online (saves battery when offline)
                if (isOnline) {
                    startDriverLocationService()
                } else {
                    LocationTrackingService.stop(context)
                }

                // Emit status via WebSocket
                socketManager.emitStatusUpdate(if (isOnline) "online" else "offline")
            } catch (e: Exception) {
                _error.value = "Failed to update online status: ${e.message}"
            } finally {
                _isLoading.value = false
            }
        }
    }

    override fun onCleared() {
        super.onCleared()
    }

}