package com.smartsoko.merchant.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.merchant.data.model.Merchant
import com.smartsoko.merchant.data.model.Order
import com.smartsoko.merchant.data.model.OrderStatus
import com.smartsoko.merchant.data.model.Product
import com.smartsoko.merchant.data.repository.MerchantRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MerchantViewModel : ViewModel() {
    private val repository = MerchantRepository()

    private val _uiState = MutableStateFlow(MerchantUiState())
    val uiState: StateFlow<MerchantUiState> = _uiState.asStateFlow()

    init {
        checkAuthState()
    }

    private fun checkAuthState() {
        val user = repository.currentUser
        if (user != null) {
            _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
            loadMerchantData()
        } else {
            _uiState.update { it.copy(isAuthenticated = false, isLoading = false) }
        }
    }

    private fun loadMerchantData() {
        viewModelScope.launch {
            repository.getMerchantForCurrentUser().collect { merchant ->
                _uiState.update { it.copy(merchant = merchant) }
                merchant?.let { loadOrders(it.id) }
            }
        }
    }

    private fun loadOrders(merchantId: String) {
        viewModelScope.launch {
            repository.getOrdersForMerchant(merchantId).collect { orders ->
                _uiState.update {
                    it.copy(
                        orders = orders,
                        filteredOrders = applyFilter(orders, it.currentFilter)
                    )
                }
            }
        }
    }

    fun loadProducts() {
        val merchantId = _uiState.value.merchant?.id ?: return
        viewModelScope.launch {
            repository.getProductsForMerchant(merchantId).collect { products ->
                _uiState.update { it.copy(products = products) }
            }
        }
    }

    fun updateOrderStatus(orderId: String, status: OrderStatus) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.updateOrderStatus(orderId, status)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false) }
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message) }
                }
        }
    }

    fun acceptOrder(orderId: String) = updateOrderStatus(orderId, OrderStatus.ACCEPTED)
    fun rejectOrder(orderId: String) = updateOrderStatus(orderId, OrderStatus.REJECTED)
    fun markOrderReady(orderId: String) = updateOrderStatus(orderId, OrderStatus.READY)
    fun markOrderDelivered(orderId: String) = updateOrderStatus(orderId, OrderStatus.DELIVERED)

    fun updateProductAvailability(productId: String, available: Boolean) {
        viewModelScope.launch {
            repository.updateProductAvailability(productId, available)
                .onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    fun deleteProduct(productId: String) {
        viewModelScope.launch {
            repository.deleteProduct(productId)
                .onFailure { error ->
                    _uiState.update { it.copy(error = error.message) }
                }
        }
    }

    fun addProduct(
        name: String,
        description: String,
        price: Double,
        category: String,
        unit: String,
        imageUri: android.net.Uri?,
        onSuccess: () -> Unit
    ) {
        val merchantId = _uiState.value.merchant?.id ?: return
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            
            var imageUrl = ""
            if (imageUri != null) {
                repository.uploadProductImage(merchantId, imageUri)
                    .onSuccess { url -> imageUrl = url }
                    .onFailure { error ->
                        _uiState.update { it.copy(isLoading = false, error = error.message) }
                        return@launch
                    }
            }

            val product = Product(
                merchantId = merchantId,
                name = name,
                description = description,
                price = price,
                category = category,
                unit = unit,
                imageUrl = imageUrl
            )
            repository.addProduct(product)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false) }
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message) }
                }
        }
    }

    fun setFilter(filter: OrderFilter) {
        _uiState.update {
            it.copy(
                currentFilter = filter,
                filteredOrders = applyFilter(it.orders, filter)
            )
        }
    }

    private fun applyFilter(orders: List<Order>, filter: OrderFilter): List<Order> {
        return when (filter) {
            OrderFilter.ALL -> orders
            OrderFilter.PENDING -> orders.filter { it.status == OrderStatus.PENDING }
            OrderFilter.ACTIVE -> orders.filter { it.status in listOf(OrderStatus.ACCEPTED, OrderStatus.READY) }
            OrderFilter.COMPLETED -> orders.filter { it.status in listOf(OrderStatus.DELIVERED, OrderStatus.COMPLETED) }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.signIn(email, password)
                .onSuccess {
                    _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
                    loadMerchantData()
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Authentication failed")
                }
        }
    }

    fun signOut() {
        repository.signOut()
        _uiState.update { MerchantUiState(isAuthenticated = false, isLoading = false) }
    }
}

data class MerchantUiState(
    val isAuthenticated: Boolean = false,
    val isLoading: Boolean = true,
    val merchant: Merchant? = null,
    val orders: List<Order> = emptyList(),
    val filteredOrders: List<Order> = emptyList(),
    val products: List<Product> = emptyList(),
    val currentFilter: OrderFilter = OrderFilter.ALL,
    val error: String? = null
)

enum class OrderFilter {
    ALL, PENDING, ACTIVE, COMPLETED
}
