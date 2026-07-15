package com.smartsoko.driver.ui.state

import com.smartsoko.driver.domain.model.*
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

data class DriverUiState(
    val isLoggedIn: Boolean = false,
    val isOnline: Boolean = false,
    val isNewDriver: Boolean = false,
    val driver: Driver? = null,
    val authToken: String = "",
    val activeOrder: Order? = null,
    val incomingOrder: Order? = null,
    val location: Location? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@Singleton
class DriverState @Inject constructor() {
    private val _state = MutableStateFlow(DriverUiState())
    val state: StateFlow<DriverUiState> = _state.asStateFlow()

    fun update(transform: DriverUiState.() -> DriverUiState) {
        _state.value = _state.value.transform()
    }

    fun setLoggedIn(token: String, driver: Driver, isNew: Boolean) {
        _state.value = _state.value.copy(isLoggedIn = true, authToken = token, driver = driver, isNewDriver = isNew)
    }

    fun setOnline(online: Boolean) {
        _state.value = _state.value.copy(isOnline = online)
    }

    fun setActiveOrder(order: Order?) {
        _state.value = _state.value.copy(activeOrder = order)
    }

    fun setIncomingOrder(order: Order?) {
        _state.value = _state.value.copy(incomingOrder = order)
    }

    fun setLocation(location: Location?) {
        _state.value = _state.value.copy(location = location)
    }

    fun setLoading(loading: Boolean) {
        _state.value = _state.value.copy(isLoading = loading)
    }

    fun setError(error: String?) {
        _state.value = _state.value.copy(error = error)
    }

    fun reset() {
        _state.value = DriverUiState()
    }
}
