package com.smartsoko.customer.presentation.payment

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.customer.domain.model.PaymentMethod
import com.smartsoko.customer.domain.model.PaymentType
import com.smartsoko.customer.domain.repository.PaymentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

data class PaymentMethodsUiState(
    val isLoading: Boolean = false,
    val methods: List<PaymentMethod> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class PaymentMethodsViewModel @Inject constructor(
    private val paymentRepository: PaymentRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(PaymentMethodsUiState())
    val uiState: StateFlow<PaymentMethodsUiState> = _uiState.asStateFlow()

    init {
        reload()
    }

    fun reload() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            try {
                val methods = paymentRepository.getPaymentMethods().first()
                _uiState.value = _uiState.value.copy(isLoading = false, methods = methods)
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
            }
        }
    }

    fun addPaymentMethod(type: PaymentType, displayName: String, lastFour: String?, provider: String?) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val method = PaymentMethod(
                id = "",
                type = type,
                displayName = displayName,
                lastFourDigits = lastFour,
                provider = provider
            )
            paymentRepository.addPaymentMethod(method)
                .onSuccess { reload() }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
                }
        }
    }

    fun deletePaymentMethod(paymentMethodId: String) {
        viewModelScope.launch {
            paymentRepository.deletePaymentMethod(paymentMethodId)
            reload()
        }
    }
}
