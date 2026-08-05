package com.smartsoko.driver.ui.screen.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.driver.data.local.AppDatabase
import com.smartsoko.driver.data.remote.WebSocketManager
import com.smartsoko.driver.data.repository.AuthRepository
import com.smartsoko.driver.domain.model.Driver
import com.smartsoko.driver.ui.state.DriverState
import com.smartsoko.driver.util.AppConfig
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class AuthUiState(
    val phone: String = "",
    val otp: String = "",
    val otpSent: Boolean = false,
    val isLoading: Boolean = false,
    val error: String? = null,
    val verified: Boolean = false,
    val isNewDriver: Boolean = false
)

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val driverState: DriverState,
    private val db: AppDatabase,
    private val webSocketManager: WebSocketManager
) : ViewModel() {

    private val _state = MutableStateFlow(AuthUiState())
    val state = _state.asStateFlow()

    fun setPhone(phone: String) {
        _state.value = _state.value.copy(phone = phone, error = null)
    }

    fun setOtp(otp: String) {
        _state.value = _state.value.copy(otp = otp, error = null)
    }

    fun sendOtp() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = authRepository.sendOtp(_state.value.phone)
            result.fold(
                onSuccess = { _state.value = _state.value.copy(otpSent = true, isLoading = false) },
                onFailure = { _state.value = _state.value.copy(error = it.message, isLoading = false) }
            )
        }
    }

    fun verifyOtp() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val result = authRepository.verifyOtp(_state.value.phone, _state.value.otp, null)
            result.fold(
                onSuccess = { auth ->
                    val driver = Driver(
                        id = auth.driverId, fullName = auth.fullName ?: "",
                        phone = auth.phone, email = auth.email ?: "",
                        photoUrl = null, vehicleType = null, vehiclePlate = null,
                        rating = 0.0, totalDeliveries = 0, isOnline = false, isVerified = true
                    )
                    driverState.setLoggedIn(auth.token, driver, auth.isNew)
                    db.driverPrefsDao().upsert(com.smartsoko.driver.data.local.entity.DriverPrefsEntity())
                    webSocketManager.connect(AppConfig.WEBSOCKET_URL, auth.token)
                    _state.value = _state.value.copy(verified = true, isLoading = false, isNewDriver = auth.isNew)
                },
                onFailure = { _state.value = _state.value.copy(error = it.message, isLoading = false) }
            )
        }
    }

    fun completeProfile(fullName: String, email: String, vehicleType: String, vehiclePlate: String) {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true, error = null)
            val token = driverState.state.value.authToken
            val result = authRepository.completeProfile(token, fullName, email, vehicleType, vehiclePlate)
            result.fold(
                onSuccess = {
                    _state.value = _state.value.copy(isLoading = false, isNewDriver = false)
                },
                onFailure = { _state.value = _state.value.copy(error = it.message, isLoading = false) }
            )
        }
    }
}
