package com.smartsoko.customer.presentation.profile

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.customer.domain.model.OrderStatus
import com.smartsoko.customer.domain.model.User
import com.smartsoko.customer.domain.repository.AuthRepository
import com.smartsoko.customer.domain.repository.OrderRepository
import com.smartsoko.customer.domain.repository.UserRepository
import com.smartsoko.customer.domain.usecase.LogoutUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProfileUiState(
    val isLoading: Boolean = true,
    val user: User? = null,
    val orderCount: Int = 0,
    val addressCount: Int = 0,
    val paymentMethodCount: Int = 0,
    val error: String? = null,
    val isLoggingOut: Boolean = false,
    val logoutComplete: Boolean = false,
    val navigateToOrders: Boolean = false,
    val navigateToAddresses: Boolean = false,
    val navigateToPaymentMethods: Boolean = false,
    val navigateToSettings: Boolean = false
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val userRepository: UserRepository,
    private val orderRepository: OrderRepository,
    private val logoutUseCase: LogoutUseCase
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProfileUiState())
    val uiState: StateFlow<ProfileUiState> = _uiState.asStateFlow()

    init {
        loadProfile()
    }

    private fun loadProfile() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            try {
                val userResult = authRepository.getCurrentUser()
                val user = userResult.getOrNull()
                val profile = userRepository.getUserProfile().first()

                var addressCount = 0
                var paymentMethodCount = 0
                if (profile != null) {
                    addressCount = profile.addresses.size
                    paymentMethodCount = profile.savedPaymentMethods.size
                }

                val orderCount = orderRepository.getOrdersByStatus(OrderStatus.PENDING).first().size +
                    orderRepository.getOrdersByStatus(OrderStatus.ACCEPTED).first().size +
                    orderRepository.getOrdersByStatus(OrderStatus.PREPARING).first().size +
                    orderRepository.getOrdersByStatus(OrderStatus.READY_FOR_PICKUP).first().size +
                    orderRepository.getOrdersByStatus(OrderStatus.ON_THE_WAY).first().size +
                    orderRepository.getOrdersByStatus(OrderStatus.DELIVERED).first().size

                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    user = user ?: profile?.user,
                    orderCount = orderCount,
                    addressCount = addressCount,
                    paymentMethodCount = paymentMethodCount
                )
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message
                )
            }
        }
    }

    fun logout() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoggingOut = true)
            val result = logoutUseCase()
            _uiState.value = _uiState.value.copy(
                isLoggingOut = false,
                logoutComplete = result.isSuccess
            )
        }
    }

    fun navigateToOrders() {
        _uiState.value = _uiState.value.copy(navigateToOrders = true)
    }

    fun navigateToAddresses() {
        _uiState.value = _uiState.value.copy(navigateToAddresses = true)
    }

    fun navigateToPaymentMethods() {
        _uiState.value = _uiState.value.copy(navigateToPaymentMethods = true)
    }

    fun navigateToSettings() {
        _uiState.value = _uiState.value.copy(navigateToSettings = true)
    }

    fun clearNavigation() {
        _uiState.value = _uiState.value.copy(
            navigateToOrders = false,
            navigateToAddresses = false,
            navigateToPaymentMethods = false,
            navigateToSettings = false,
            logoutComplete = false
        )
    }
}
