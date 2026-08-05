package com.smartsoko.customer.presentation.cart

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.customer.domain.model.Cart
import com.smartsoko.customer.domain.model.CartSummary
import com.smartsoko.customer.domain.usecase.ClearCartUseCase
import com.smartsoko.customer.domain.usecase.GetCartUseCase
import com.smartsoko.customer.domain.usecase.RemoveCartItemUseCase
import com.smartsoko.customer.domain.usecase.UpdateCartItemUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class CartViewModel @Inject constructor(
    private val getCartUseCase: GetCartUseCase,
    private val updateCartItemUseCase: UpdateCartItemUseCase,
    private val removeCartItemUseCase: RemoveCartItemUseCase,
    private val clearCartUseCase: ClearCartUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(CartUiState())
    val uiState: StateFlow<CartUiState> = _uiState.asStateFlow()
    
    init {
        loadCart()
    }
    
    private fun loadCart() {
        viewModelScope.launch {
            getCartUseCase().collect { cart ->
                _uiState.value = _uiState.value.copy(cart = cart)
                
                val itemCount = cart?.items?.sumOf { it.quantity } ?: 0
                val subtotal = cart?.items?.sumOf { it.price * it.quantity } ?: 0.0
                _uiState.value = _uiState.value.copy(
                    itemCount = itemCount,
                    subtotal = subtotal
                )
            }
        }
    }
    
    fun updateQuantity(cartItemId: String, quantity: Int) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            updateCartItemUseCase(cartItemId, quantity)
                .onSuccess { cart ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        cart = cart
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun removeItem(cartItemId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            removeCartItemUseCase(cartItemId)
                .onSuccess { cart ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        cart = cart
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun clearCart() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            clearCartUseCase()
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        cart = null,
                        itemCount = 0,
                        subtotal = 0.0
                    )
                }
                .onFailure { exception ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = exception.message
                    )
                }
        }
    }
    
    fun onCheckout() {
        _uiState.value = _uiState.value.copy(navigateToCheckout = true)
    }
    
    fun onNavigateBack() {
        _uiState.value = _uiState.value.copy(navigateBack = true)
    }
    
    fun clearNavigation() {
        _uiState.value = _uiState.value.copy(
            navigateToCheckout = false,
            navigateBack = false
        )
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}

data class CartUiState(
    val cart: Cart? = null,
    val itemCount: Int = 0,
    val subtotal: Double = 0.0,
    val isLoading: Boolean = false,
    val navigateToCheckout: Boolean = false,
    val navigateBack: Boolean = false,
    val error: String? = null
)
