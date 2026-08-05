package com.smartsoko.customer.presentation.productdetails

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.customer.domain.model.Product
import com.smartsoko.customer.domain.usecase.AddToCartUseCase
import com.smartsoko.customer.domain.usecase.GetProductByIdUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ProductDetailsViewModel @Inject constructor(
    private val getProductByIdUseCase: GetProductByIdUseCase,
    private val addToCartUseCase: AddToCartUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ProductDetailsUiState())
    val uiState: StateFlow<ProductDetailsUiState> = _uiState.asStateFlow()
    
    fun loadProduct(productId: String) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            
            getProductByIdUseCase(productId)
                .onSuccess { product ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        product = product,
                        error = null
                    )
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        error = e.message
                    )
                }
        }
    }
    
    fun onQuantityChange(quantity: Int) {
        _uiState.value = _uiState.value.copy(quantity = quantity)
    }
    
    fun onAddToCart() {
        val product = _uiState.value.product ?: return
        val quantity = _uiState.value.quantity
        
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isAddingToCart = true)
            
            addToCartUseCase(product.id, quantity)
                .onSuccess {
                    _uiState.value = _uiState.value.copy(
                        isAddingToCart = false,
                        isAddedToCart = true,
                        error = null
                    )
                }
                .onFailure { e ->
                    _uiState.value = _uiState.value.copy(
                        isAddingToCart = false,
                        error = e.message
                    )
                }
        }
    }
    
    fun onBuyNow() {
        _uiState.value = _uiState.value.copy(navigateToCheckout = true)
    }
    
    fun onNavigateBack() {
        _uiState.value = _uiState.value.copy(navigateBack = true)
    }
    
    fun onNavigateToCart() {
        _uiState.value = _uiState.value.copy(navigateToCart = true)
    }
    
    fun clearNavigation() {
        _uiState.value = _uiState.value.copy(
            navigateToCheckout = false,
            navigateBack = false,
            navigateToCart = false,
            isAddedToCart = false
        )
    }
    
    fun clearError() {
        _uiState.value = _uiState.value.copy(error = null)
    }
}

data class ProductDetailsUiState(
    val product: Product? = null,
    val quantity: Int = 1,
    val isLoading: Boolean = false,
    val isAddingToCart: Boolean = false,
    val isAddedToCart: Boolean = false,
    val navigateToCheckout: Boolean = false,
    val navigateBack: Boolean = false,
    val navigateToCart: Boolean = false,
    val error: String? = null
)
