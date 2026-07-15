package com.smartsoko.driver.ui.screen.profile

import android.app.Application
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.driver.data.local.AppDatabase
import com.smartsoko.driver.data.local.entity.DriverPrefsEntity
import com.smartsoko.driver.data.remote.WebSocketManager
import com.smartsoko.driver.data.repository.DriverRepository
import com.smartsoko.driver.domain.model.Driver
import com.smartsoko.driver.service.LocationTrackingService
import com.smartsoko.driver.ui.state.DriverState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val driver: Driver? = null,
    val isOnline: Boolean = false,
    val isLoading: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val driverState: DriverState,
    private val driverRepository: DriverRepository,
    private val webSocketManager: WebSocketManager,
    private val db: AppDatabase,
    private val application: Application
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state = _state.asStateFlow()

    init {
        _state.value = ProfileUiState(
            driver = driverState.state.value.driver,
            isOnline = driverState.state.value.isOnline
        )
    }

    fun logout() {
        viewModelScope.launch {
            webSocketManager.disconnect()
            LocationTrackingService.stop(application)
            driverState.reset()
            db.driverPrefsDao().upsert(DriverPrefsEntity(id = 1, isOnline = false))
            db.orderDao().clearAll()
            _state.value = ProfileUiState()
        }
    }
}
