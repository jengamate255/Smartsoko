package com.smartsoko.customer.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.customer.domain.usecase.IsLoggedInUseCase
import com.smartsoko.customer.presentation.navigation.Screen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class MainViewModel @Inject constructor(
    private val isLoggedInUseCase: IsLoggedInUseCase
) : ViewModel() {
    
    private val _startDestination = MutableStateFlow<String>(Screen.Splash.route)
    val startDestination = _startDestination.asStateFlow()
    
    init {
        checkAuthStatus()
    }
    
    private fun checkAuthStatus() {
        viewModelScope.launch {
            isLoggedInUseCase().collect { isLoggedIn ->
                _startDestination.value = if (isLoggedIn) {
                    Screen.Home.route
                } else {
                    Screen.Onboarding.route
                }
            }
        }
    }
}