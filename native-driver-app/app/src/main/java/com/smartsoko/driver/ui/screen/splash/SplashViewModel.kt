package com.smartsoko.driver.ui.screen.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.driver.data.local.AppDatabase
import com.smartsoko.driver.ui.state.DriverState
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SplashState(
    val isLoading: Boolean = true,
    val isLoggedIn: Boolean = false,
    val isNewDriver: Boolean = false
)

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val driverState: DriverState,
    private val db: AppDatabase
) : ViewModel() {

    private val _state = MutableStateFlow(SplashState())
    val state = _state.asStateFlow()

    init {
        checkSession()
    }

    private fun checkSession() {
        viewModelScope.launch {
            delay(800)
            val prefs = db.driverPrefsDao().getPrefs()
            val isLoggedIn = prefs != null && driverState.state.value.isLoggedIn

            if (isLoggedIn) {
                _state.value = SplashState(isLoading = false, isLoggedIn = true, isNewDriver = driverState.state.value.isNewDriver)
            } else {
                _state.value = SplashState(isLoading = false, isLoggedIn = false)
            }
        }
    }
}
