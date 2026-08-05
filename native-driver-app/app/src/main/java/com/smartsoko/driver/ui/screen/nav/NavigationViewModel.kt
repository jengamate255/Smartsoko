package com.smartsoko.driver.ui.screen.nav

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.driver.data.remote.WebSocketManager
import com.smartsoko.driver.data.repository.OrderRepository
import com.smartsoko.driver.domain.model.Order
import com.smartsoko.driver.domain.model.OrderStatus
import com.smartsoko.driver.service.LocationState
import com.smartsoko.driver.ui.state.DriverState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class NavUiState(
    val order: Order? = null,
    val driverLat: Double = 0.0,
    val driverLng: Double = 0.0,
    val eta: String = "",
    val distance: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val phase: NavPhase = NavPhase.NAVIGATE_TO_PICKUP
)

enum class NavPhase {
    NAVIGATE_TO_PICKUP,
    NAVIGATE_TO_DROPOFF,
    COMPLETED
}

@HiltViewModel
class NavigationViewModel @Inject constructor(
    private val driverState: DriverState,
    private val orderRepository: OrderRepository,
    private val locationState: LocationState,
    private val webSocketManager: WebSocketManager
) : ViewModel() {

    private val _state = MutableStateFlow(NavUiState())
    val state: StateFlow<NavUiState> = _state.asStateFlow()

    fun loadOrder(orderId: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            val order = driverState.state.value.activeOrder
            if (order != null && order.id == orderId) {
                _state.value = _state.value.copy(
                    order = order,
                    phase = if (order.status == OrderStatus.PICKED_UP || order.status == OrderStatus.IN_TRANSIT)
                        NavPhase.NAVIGATE_TO_DROPOFF else NavPhase.NAVIGATE_TO_PICKUP
                )
            }
            _state.value = _state.value.copy(isLoading = false)
        }

        viewModelScope.launch {
            locationState.location.collect { loc ->
                if (loc != null) {
                    _state.value = _state.value.copy(driverLat = loc.lat, driverLng = loc.lng)
                }
            }
        }
    }

    fun updateStatus(orderId: String, status: OrderStatus) {
        viewModelScope.launch {
            val token = driverState.state.value.authToken
            orderRepository.updateStatus(token, orderId, status)
            when (status) {
                OrderStatus.PICKED_UP -> _state.value = _state.value.copy(phase = NavPhase.NAVIGATE_TO_DROPOFF)
                OrderStatus.DELIVERED -> _state.value = _state.value.copy(phase = NavPhase.COMPLETED)
                else -> {}
            }
        }
    }

    fun navigateToPickupInMaps(@Suppress("UNUSED_PARAMETER") order: Order) {
    }

    fun navigateToDropoffInMaps(@Suppress("UNUSED_PARAMETER") order: Order) {
    }
}
