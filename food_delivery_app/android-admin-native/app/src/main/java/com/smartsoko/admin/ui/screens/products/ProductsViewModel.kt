package com.smartsoko.admin.ui.screens.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.admin.data.remote.dto.ProductDto
import com.smartsoko.admin.domain.repository.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductsUiState(
    val isLoading: Boolean = true,
    val products: List<ProductDto> = emptyList(),
    val searchQuery: String = "",
    val categoryFilter: String = "all",
    val error: String? = null
)

data class ProductFormState(
    val name: String = "",
    val price: String = "",
    val description: String = "",
    val category: String = "general",
    val stock: String = "0",
    val unit: String = "piece",
    val imageUrl: String = "",
    val isSubmitting: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class ProductsViewModel @Inject constructor(
    private val repository: AdminRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductsUiState())
    val uiState: StateFlow<ProductsUiState> = _uiState.asStateFlow()

    private val _formState = MutableStateFlow(ProductFormState())
    val formState: StateFlow<ProductFormState> = _formState.asStateFlow()

    private var allProducts: List<ProductDto> = emptyList()

    fun loadProducts() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val result = repository.getProducts()
            result.fold(
                onSuccess = { products ->
                    allProducts = products
                    applyFilters()
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
                }
            )
        }
    }

    fun setSearchQuery(query: String) { _uiState.value = _uiState.value.copy(searchQuery = query); applyFilters() }
    fun setCategoryFilter(cat: String) { _uiState.value = _uiState.value.copy(categoryFilter = cat); applyFilters() }

    fun updateForm(block: (ProductFormState) -> ProductFormState) { _formState.value = block(_formState.value) }

    fun submitProduct() {
        val s = _formState.value
        if (s.name.isBlank() || s.price.isBlank()) { _formState.value = s.copy(error = "Name and price required"); return }
        viewModelScope.launch {
            _formState.value = _formState.value.copy(isSubmitting = true)
            val data = mapOf<String, Any>(
                "name" to s.name, "price" to (s.price.toDoubleOrNull() ?: 0.0),
                "description" to s.description, "category" to s.category,
                "stock" to (s.stock.toIntOrNull() ?: 0), "unit" to s.unit, "imageUrl" to s.imageUrl
            )
            val result = repository.createProduct(data)
            result.fold(
                onSuccess = { _formState.value = ProductFormState(); loadProducts() },
                onFailure = { e -> _formState.value = s.copy(isSubmitting = false, error = e.message) }
            )
        }
    }

    fun deleteProduct(id: String) {
        viewModelScope.launch { repository.deleteProduct(id); loadProducts() }
    }

    private fun applyFilters() {
        val state = _uiState.value
        var filtered = allProducts
        if (state.categoryFilter != "all") filtered = filtered.filter { it.category == state.categoryFilter }
        if (state.searchQuery.isNotBlank()) {
            val q = state.searchQuery.lowercase()
            filtered = filtered.filter { (it.name ?: "").lowercase().contains(q) || (it.category ?: "").lowercase().contains(q) }
        }
        _uiState.value = _uiState.value.copy(isLoading = false, products = filtered)
    }
}
