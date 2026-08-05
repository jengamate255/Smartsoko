package com.smartsoko.admin.ui.screens.products

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.admin.domain.repository.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProductDetailUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val name: String = "",
    val description: String = "",
    val price: Double = 0.0,
    val category: String = "",
    val stock: Int = 0,
    val unit: String = "",
    val isAvailable: Boolean = true
)

@HiltViewModel
class ProductDetailViewModel @Inject constructor(
    private val repository: AdminRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(ProductDetailUiState())
    val uiState: StateFlow<ProductDetailUiState> = _uiState.asStateFlow()

    private var productId: String = ""

    fun loadProduct(id: String) {
        productId = id
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val result = repository.getProduct(id)
            result.fold(
                onSuccess = { p ->
                    _uiState.value = ProductDetailUiState(
                        isLoading = false, name = p.name ?: "Unknown",
                        description = p.description ?: "", price = p.price ?: 0.0,
                        category = p.category ?: "", stock = p.stock ?: 0,
                        unit = p.unit ?: "", isAvailable = p.isAvailable ?: true
                    )
                },
                onFailure = { e -> _uiState.value = ProductDetailUiState(isLoading = false, error = e.message) }
            )
        }
    }

    fun deleteProduct() {
        viewModelScope.launch { repository.deleteProduct(productId) }
    }
}
