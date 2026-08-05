package com.smartsoko.customer.presentation.splash

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.customer.domain.repository.AuthRepository
import com.smartsoko.customer.domain.usecase.IsLoggedInUseCase
import com.smartsoko.customer.presentation.navigation.Screen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class SplashViewModel @Inject constructor(
    private val isLoggedInUseCase: IsLoggedInUseCase,
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<SplashUiState>(SplashUiState.Loading)
    val uiState: StateFlow<SplashUiState> = _uiState.asStateFlow()
    
    private val _startDestination = MutableStateFlow<String>(Screen.Splash.route)
    val startDestination: StateFlow<String> = _startDestination.asStateFlow()
    
    init {
        checkAuthStatus()
    }
    
    private fun checkAuthStatus() {
        viewModelScope.launch {
            authRepository.restoreSession()
            delay(2000)
            
            isLoggedInUseCase().collect { isLoggedIn ->
                _uiState.value = if (isLoggedIn) {
                    SplashUiState.NavigateToHome
                } else {
                    SplashUiState.NavigateToLogin
                }
                _startDestination.value = if (isLoggedIn) {
                    Screen.Home.route
                } else {
                    Screen.Login.route
                }
            }
        }
    }
}

sealed class SplashUiState {
    object Loading : SplashUiState()
    object NavigateToHome : SplashUiState()
    object NavigateToLogin : SplashUiState()
    object NavigateToOnboarding : SplashUiState()
}
