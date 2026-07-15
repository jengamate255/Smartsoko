package com.smartsoko.driver.ui.screen.home

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.driver.data.local.AppDatabase
import com.smartsoko.driver.data.remote.WebSocketManager
import com.smartsoko.driver.data.remote.WsEvent
import com.smartsoko.driver.data.remote.dto.OrderDto
import com.smartsoko.driver.data.repository.DriverRepository
import com.smartsoko.driver.data.repository.OrderRepository
import com.smartsoko.driver.domain.model.Location
import com.smartsoko.driver.domain.model.Order
import com.smartsoko.driver.domain.model.OrderStatus
import com.smartsoko.driver.service.LocationState
import com.smartsoko.driver.service.LocationTrackingService
import com.smartsoko.driver.ui.state.DriverState
import com.smartsoko.driver.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HomeUiState(
    val isOnline: Boolean = false,
    val activeOrder: Order? = null,
    val incomingOrder: Order? = null,
    val incomingTimer: Int = 15,
    val location: Location? = null,
    val isLoading: Boolean = false,
    val error: String? = null,
    val hasLocationPermission: Boolean = false
)

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val driverState: DriverState,
    private val driverRepository: DriverRepository,
    private val orderRepository: OrderRepository,
    private val locationState: LocationState,
    private val webSocketManager: WebSocketManager,
    private val db: AppDatabase
) : ViewModel() {

    private val _state = MutableStateFlow(HomeUiState())
    val state: StateFlow<HomeUiState> = _state.asStateFlow()

    init {
        observeLocation()
        observeDriverPrefs()
        observeActiveOrder()
        observeWebSocket()
    }

    private fun observeLocation() {
        viewModelScope.launch {
            locationState.location.collect { loc ->
                _state.value = _state.value.copy(location = loc)
                driverState.setLocation(loc)
                loc?.let {
                    driverRepository.updateLocation(it.lat, it.lng, it.bearing)
                }
            }
        }
    }

    private fun observeDriverPrefs() {
        viewModelScope.launch {
            driverRepository.getPrefsFlow().collect { prefs ->
                if (prefs != null) {
                    _state.value = _state.value.copy(isOnline = prefs.isOnline)
                    driverState.setOnline(prefs.isOnline)
                }
            }
        }
    }

    private fun observeActiveOrder() {
        viewModelScope.launch {
            orderRepository.getActiveOrderFlow().collect { order ->
                _state.value = _state.value.copy(activeOrder = order)
                driverState.setActiveOrder(order)
            }
        }
    }

    private fun observeWebSocket() {
        viewModelScope.launch {
            webSocketManager.events.collect { event ->
                when (event) {
                    is WsEvent.NewOrder -> {
                        val order = event.order.toDomain()
                        _state.value = _state.value.copy(incomingOrder = order, incomingTimer = 15)
                        driverState.setIncomingOrder(order)
                        startIncomingTimer()
                    }
                    is WsEvent.OrderAccepted -> {
                        if (_state.value.incomingOrder?.id == event.orderId) {
                            _state.value = _state.value.copy(incomingOrder = null)
                            driverState.setIncomingOrder(null)
                        }
                    }
                    is WsEvent.OrderStatusChanged -> {
                        refreshActiveOrder()
                    }
                    else -> {}
                }
            }
        }
    }

    private fun startIncomingTimer() {
        viewModelScope.launch {
            for (i in 15 downTo 0) {
                _state.value = _state.value.copy(incomingTimer = i)
                if (i == 0) {
                    _state.value = _state.value.copy(incomingOrder = null)
                    driverState.setIncomingOrder(null)
                }
                delay(1000)
            }
        }
    }

    fun checkLocationPermission(context: Context) {
        val hasPermission = ContextCompat.checkSelfPermission(
            context,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        _state.value = _state.value.copy(hasLocationPermission = hasPermission)
    }

    fun toggleOnline(context: Context) {
        viewModelScope.launch {
            val newState = !_state.value.isOnline
            driverRepository.setOnline(newState)
            _state.value = _state.value.copy(isOnline = newState)
            driverState.setOnline(newState)

            if (newState) {
                if (_state.value.hasLocationPermission) {
                    LocationTrackingService.start(context)
                }
            } else {
                LocationTrackingService.stop(context)
            }
        }
    }

    fun acceptOrder() {
        val order = _state.value.incomingOrder ?: return
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val token = driverState.state.value.authToken
            val result = orderRepository.acceptOrder(token, order.id)
            when (val r = result) {
                is Resource.Success -> {
                    _state.value = _state.value.copy(incomingOrder = null, isLoading = false)
                    driverState.setIncomingOrder(null)
                }
                is Resource.Error -> {
                    _state.value = _state.value.copy(error = r.message, isLoading = false)
                }
                is Resource.Loading -> { }
            }
        }
    }

    fun rejectOrder() {
        val order = _state.value.incomingOrder ?: return
        viewModelScope.launch {
            val token = driverState.state.value.authToken
            orderRepository.rejectOrder(token, order.id)
            _state.value = _state.value.copy(incomingOrder = null)
            driverState.setIncomingOrder(null)
        }
    }

    fun dismissIncoming() {
        _state.value = _state.value.copy(incomingOrder = null)
        driverState.setIncomingOrder(null)
    }

    fun updateStatus(orderId: String, status: OrderStatus) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val token = driverState.state.value.authToken
            orderRepository.updateStatus(token, orderId, status)
            _state.value = _state.value.copy(isLoading = false)
        }
    }

    private fun refreshActiveOrder() {
        viewModelScope.launch {
            orderRepository.getActiveOrderFlow().first().let { order ->
                _state.value = _state.value.copy(activeOrder = order)
                driverState.setActiveOrder(order)
            }
        }
    }

    fun clearError() {
        _state.value = _state.value.copy(error = null)
    }
}

private fun OrderDto.toDomain() = Order(
    id = id, pickupName = pickupName, pickupAddress = pickupAddress,
    pickupLat = pickupLat, pickupLng = pickupLng,
    dropoffName = dropoffName, dropoffAddress = dropoffAddress,
    dropoffLat = dropoffLat, dropoffLng = dropoffLng,
    customerName = customerName, customerPhone = customerPhone,
    items = items.map { com.smartsoko.driver.domain.model.OrderItem(it.name, it.quantity, it.price, it.notes) },
    totalAmount = totalAmount, deliveryFee = deliveryFee,
    status = try { OrderStatus.valueOf(status) } catch (_: Exception) { OrderStatus.PENDING },
    estimatedDistance = estimatedDistance, estimatedDuration = estimatedDuration,
    createdAt = createdAt, updatedAt = updatedAt,
    deliveryInstructions = deliveryInstructions
)
