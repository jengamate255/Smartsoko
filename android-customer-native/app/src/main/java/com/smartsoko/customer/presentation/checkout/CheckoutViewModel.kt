package com.smartsoko.customer.presentation.checkout

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.customer.domain.model.Address
import com.smartsoko.customer.domain.model.CartSummary
import com.smartsoko.customer.domain.model.PaymentMethod
import com.smartsoko.customer.domain.repository.CartRepository
import com.smartsoko.customer.domain.repository.OrderRepository
import com.smartsoko.customer.domain.repository.PaymentRepository
import com.smartsoko.customer.domain.repository.UserRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.coroutines.delay
import javax.inject.Inject

data class CheckoutUiState(
    val isLoading: Boolean = true,
    val cartSummary: CartSummary? = null,
    val addresses: List<Address> = emptyList(),
    val paymentMethods: List<PaymentMethod> = emptyList(),
    val selectedAddressId: String? = null,
    val selectedPaymentMethodId: String? = null,
    val deliveryInstructions: String = "",
    val isPlacingOrder: Boolean = false,
    val orderPlaced: Boolean = false,
    val placedOrderId: String? = null,
    val error: String? = null,
    val isProcessingPayment: Boolean = false,
    val paymentError: String? = null
)

@HiltViewModel
class CheckoutViewModel @Inject constructor(
    private val cartRepository: CartRepository,
    private val orderRepository: OrderRepository,
    private val userRepository: UserRepository,
    private val paymentRepository: PaymentRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(CheckoutUiState())
    val uiState: StateFlow<CheckoutUiState> = _uiState.asStateFlow()

    init {
        loadCheckoutData()
    }

    fun loadCheckoutData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            try {
                val summary = cartRepository.getCartSummary().getOrNull()
                val profile = userRepository.getUserProfile().first()
                val payments = paymentRepository.getPaymentMethods().first()
                val defaultPayment = paymentRepository.getLastUsedPaymentMethod().getOrNull()

                val addresses = profile?.addresses ?: emptyList()
                val defaultAddress = addresses.firstOrNull { it.isDefault }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        cartSummary = summary,
                        addresses = addresses,
                        paymentMethods = payments,
                        selectedAddressId = defaultAddress?.id ?: addresses.firstOrNull()?.id,
                        selectedPaymentMethodId = defaultPayment?.id ?: payments.firstOrNull()?.id
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun placeOrder() {
        val state = _uiState.value
        val addressId = state.selectedAddressId
        val paymentMethodId = state.selectedPaymentMethodId
        val isCashOnDelivery = state.paymentMethods.isEmpty()

        if (addressId == null) {
            _uiState.update { it.copy(error = "Please select address and payment method") }
            return
        }
        if (paymentMethodId == null && !isCashOnDelivery) {
            _uiState.update { it.copy(error = "Please select a payment method") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isProcessingPayment = true, paymentError = null) }
            try {
                val result = orderRepository.createOrder(
                    addressId = addressId,
                    paymentMethodId = paymentMethodId,
                    notes = state.deliveryInstructions.takeIf { it.isNotBlank() }
                )

                result.fold(
                    onSuccess = { order ->
                        withContext(Dispatchers.IO) {
                            delay(1000L)
                        }
                        cartRepository.clearCart()
                        _uiState.update {
                            it.copy(
                                isProcessingPayment = false,
                                orderPlaced = true,
                                placedOrderId = order.id
                            )
                        }
                    },
                    onFailure = { e ->
                        _uiState.update {
                            it.copy(
                                isProcessingPayment = false,
                                paymentError = e.message ?: "Failed to place order"
                            )
                        }
                    }
                )
            } catch (e: Exception) {
                _uiState.update {
                    it.copy(
                        isProcessingPayment = false,
                        paymentError = "Order failed: ${e.message}"
                    )
                }
            }
        }
    }

    fun selectAddress(addressId: String) {
        _uiState.update { it.copy(selectedAddressId = addressId) }
    }

    fun selectPaymentMethod(paymentMethodId: String?) {
        _uiState.update { it.copy(selectedPaymentMethodId = paymentMethodId) }
    }

    fun updateDeliveryInstructions(instructions: String) {
        _uiState.update { it.copy(deliveryInstructions = instructions) }
    }

    fun clearNavigation() {
        _uiState.update { it.copy(orderPlaced = false) }
    }
}
