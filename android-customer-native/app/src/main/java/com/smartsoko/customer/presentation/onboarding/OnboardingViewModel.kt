package com.smartsoko.customer.presentation.onboarding

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OnboardingViewModel @Inject constructor() : ViewModel() {
    
    private val _uiState = MutableStateFlow(OnboardingUiState(currentPage = 0))
    val uiState: StateFlow<OnboardingUiState> = _uiState.asStateFlow()
    
    private val pages = listOf(
        OnboardingPage(
            title = "Shop Anything",
            description = "Browse thousands of products from local sellers and get them delivered to your doorstep",
            imageRes = 0 // Replace with actual drawable
        ),
        OnboardingPage(
            title = "Fast Delivery",
            description = "Track your orders in real-time and get your items delivered within minutes",
            imageRes = 0 // Replace with actual drawable
        ),
        OnboardingPage(
            title = "Secure Payments",
            description = "Pay securely with M-Pesa, cards, or cash on delivery. Your data is always safe",
            imageRes = 0 // Replace with actual drawable
        )
    )
    
    fun nextPage() {
        if (_uiState.value.currentPage < pages.size - 1) {
            _uiState.value = _uiState.value.copy(currentPage = _uiState.value.currentPage + 1)
        }
    }
    
    fun previousPage() {
        if (_uiState.value.currentPage > 0) {
            _uiState.value = _uiState.value.copy(currentPage = _uiState.value.currentPage - 1)
        }
    }
    
    fun skip() {
        _uiState.value = _uiState.value.copy(onComplete = true)
    }
    
    fun getPages(): List<OnboardingPage> = pages
}

data class OnboardingUiState(
    val currentPage: Int,
    val onComplete: Boolean = false
)

data class OnboardingPage(
    val title: String,
    val description: String,
    val imageRes: Int
)
