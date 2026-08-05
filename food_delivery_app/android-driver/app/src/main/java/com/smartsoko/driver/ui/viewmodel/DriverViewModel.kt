package com.smartsoko.driver.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.driver.data.model.Driver
import com.smartsoko.driver.data.model.DriverStatus
import com.smartsoko.driver.data.model.Order
import com.smartsoko.driver.data.model.OrderStatus
import com.smartsoko.driver.data.repository.DriverRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class DriverViewModel : ViewModel() {
    private val repository = DriverRepository()

    private val _uiState = MutableStateFlow(DriverUiState())
    val uiState: StateFlow<DriverUiState> = _uiState.asStateFlow()

    init {
        checkAuthState()
    }

    private fun checkAuthState() {
        val user = repository.currentUser
        if (user != null) {
            _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
            loadDriverData()
        } else {
            _uiState.update { it.copy(isAuthenticated = false, isLoading = false) }
        }
    }

    private fun loadDriverData() {
        viewModelScope.launch {
            try {
                repository.getDriverForCurrentUser().collect { driver ->
                    _uiState.update { it.copy(driver = driver) }
                    driver?.let {
                        loadAvailableOrders()
                        loadAssignedOrders(it.id)
                    }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "Failed to load driver data") }
            }
        }
    }

    fun loadAvailableOrders() {
        viewModelScope.launch {
            try {
                repository.getAvailableOrders().collect { orders ->
                    _uiState.update { it.copy(availableOrders = orders) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "Failed to load available orders") }
            }
        }
    }

    fun loadAssignedOrders(driverId: String) {
        viewModelScope.launch {
            try {
                repository.getAssignedOrders(driverId).collect { orders ->
                    _uiState.update { it.copy(assignedOrders = orders) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "Failed to load assigned orders") }
            }
        }
    }

    fun refreshOrders() {
        val driverId = _uiState.value.driver?.id ?: return
        loadAvailableOrders()
        loadAssignedOrders(driverId)
    }

    fun acceptOrder(orderId: String) {
        val driver = _uiState.value.driver ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.acceptOrder(orderId, driver.id, driver.name)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false) }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message) }
                }
        }
    }

    fun markPickedUp(orderId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.markPickedUp(orderId)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false) }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message) }
                }
        }
    }

    fun markDelivered(orderId: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.markDelivered(orderId)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false) }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message) }
                }
        }
    }

    fun toggleOnline(isOnline: Boolean) {
        val driver = _uiState.value.driver ?: return
        val status = if (isOnline) DriverStatus.ONLINE else DriverStatus.OFFLINE
        _uiState.update { it.copy(driver = it.driver?.copy(isOnline = isOnline, status = status)) }
        viewModelScope.launch {
            repository.updateDriverStatus(driver.id, isOnline, status)
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message ?: "Failed to update status",
                            driver = it.driver?.copy(
                                isOnline = !isOnline,
                                status = if (!isOnline) DriverStatus.ONLINE else DriverStatus.OFFLINE
                            )
                        )
                    }
                }
        }
    }

    fun updateLocation(latitude: Double, longitude: Double) {
        val driverId = _uiState.value.driver?.id ?: return
        viewModelScope.launch {
            repository.updateDriverLocation(driverId, latitude, longitude)
                .onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.signIn(email, password)
                .onSuccess {
                    _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
                    loadDriverData()
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Authentication failed")
                }
        }
    }

    fun signUp(
        email: String,
        password: String,
        name: String,
        phone: String,
        vehicleType: String,
        vehiclePlate: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.signUp(
                email = email,
                password = password,
                name = name,
                phone = phone,
                vehicleType = vehicleType,
                vehiclePlate = vehiclePlate
            )
                .onSuccess {
                    _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
                    loadDriverData()
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Account creation failed")
                }
        }
    }

    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.signInWithGoogle(idToken)
                .onSuccess {
                    _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
                    loadDriverData()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message) }
                }
        }
    }

    fun signOut() {
        repository.signOut()
        _uiState.update { DriverUiState(isAuthenticated = false, isLoading = false) }
    }

    fun resetPassword(
        email: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.resetPassword(email)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false) }
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Failed to send reset email")
                }
        }
    }
}

data class DriverUiState(
    val isAuthenticated: Boolean = false,
    val isLoading: Boolean = true,
    val driver: Driver? = null,
    val availableOrders: List<Order> = emptyList(),
    val assignedOrders: List<Order> = emptyList(),
    val currentFilter: DriverOrderFilter = DriverOrderFilter.ALL,
    val error: String? = null
)

enum class DriverOrderFilter {
    ALL, PENDING, ACTIVE, DELIVERED
}
