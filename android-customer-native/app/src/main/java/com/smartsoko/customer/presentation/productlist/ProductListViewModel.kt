package com.smartsoko.customer.presentation.productlist

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.PagingData
import androidx.paging.cachedIn
import com.smartsoko.customer.domain.model.Product
import com.smartsoko.customer.domain.usecase.GetProductsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.flatMapLatest
import javax.inject.Inject

@HiltViewModel
class ProductListViewModel @Inject constructor(
    private val getProductsUseCase: GetProductsUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow(ProductListUiState())
    val uiState: StateFlow<ProductListUiState> = _uiState.asStateFlow()
    
    private val categoryId = MutableStateFlow<String?>(null)
    
    val productsFlow: Flow<PagingData<Product>> = categoryId.flatMapLatest { id ->
        getProductsUseCase(id).cachedIn(viewModelScope)
    }
    
    fun loadProducts(categoryId: String?) {
        this.categoryId.value = categoryId
    }
    
    fun onSearchQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
    }
    
    fun onProductClick(productId: String) {
        _uiState.value = _uiState.value.copy(navigateToProductDetails = productId)
    }
    
    fun onNavigateBack() {
        _uiState.value = _uiState.value.copy(navigateBack = true)
    }
    
    fun clearNavigation() {
        _uiState.value = _uiState.value.copy(
            navigateToProductDetails = null,
            navigateBack = false
        )
    }
}

data class ProductListUiState(
    val searchQuery: String = "",
    val navigateToProductDetails: String? = null,
    val navigateBack: Boolean = false
)
