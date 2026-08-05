package com.smartsoko.customer.presentation.home

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.paging.cachedIn
import com.smartsoko.customer.domain.model.Category
import com.smartsoko.customer.domain.repository.CartRepository
import com.smartsoko.customer.domain.repository.ProductRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val productRepository: ProductRepository,
    private val cartRepository: CartRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(HomeUiState())
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    val featuredProductsFlow = productRepository.getFeaturedProducts()
        .cachedIn(viewModelScope)

    val cartItemCount = cartRepository.getCartItemCount()

    private val _categories = MutableStateFlow<List<Category>>(emptyList())
    val categories: StateFlow<List<Category>> = _categories.asStateFlow()

    private val _categoriesLoading = MutableStateFlow(true)
    val categoriesLoading: StateFlow<Boolean> = _categoriesLoading.asStateFlow()

    init {
        loadCategories()
        refreshFromApi()
    }

    private fun refreshFromApi() {
        viewModelScope.launch {
            productRepository.refreshProducts()
            productRepository.refreshFeaturedProducts()
        }
    }

    private fun loadCategories() {
        viewModelScope.launch {
            _categoriesLoading.value = true
            val result = productRepository.getCategories()
            result.fold(
                onSuccess = { categories ->
                    _categories.value = categories
                },
                onFailure = { }
            )
            _categoriesLoading.value = false
        }
    }

    fun onSearchQueryChange(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
    }

    fun onCategoryClick(categoryId: String) {
        _uiState.value = _uiState.value.copy(selectedCategoryId = categoryId)
    }

    fun onProductClick(productId: String) {
        _uiState.value = _uiState.value.copy(navigateToProductDetails = productId)
    }

    fun onNavigateToCart() {
        _uiState.value = _uiState.value.copy(navigateToCart = true)
    }

    fun onNavigateToOrders() {
        _uiState.value = _uiState.value.copy(navigateToOrders = true)
    }

    fun onNavigateToProfile() {
        _uiState.value = _uiState.value.copy(navigateToProfile = true)
    }

    fun clearNavigation() {
        _uiState.value = _uiState.value.copy(
            navigateToProductDetails = null,
            navigateToCart = false,
            navigateToOrders = false,
            navigateToProfile = false
        )
    }
}

data class HomeUiState(
    val searchQuery: String = "",
    val selectedCategoryId: String? = null,
    val navigateToProductDetails: String? = null,
    val navigateToCart: Boolean = false,
    val navigateToOrders: Boolean = false,
    val navigateToProfile: Boolean = false
)
