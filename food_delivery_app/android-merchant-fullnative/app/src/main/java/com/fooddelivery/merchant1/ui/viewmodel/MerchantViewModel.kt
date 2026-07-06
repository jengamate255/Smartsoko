package com.fooddelivery.merchant1.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.fooddelivery.merchant1.data.model.Merchant
import com.fooddelivery.merchant1.data.model.Order
import com.fooddelivery.merchant1.data.model.OrderStatus
import com.fooddelivery.merchant1.data.model.Product
import com.fooddelivery.merchant1.data.repository.MerchantRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch

class MerchantViewModel : ViewModel() {
    private val repository = MerchantRepository()

    private val _uiState = MutableStateFlow(MerchantUiState())
    val uiState: StateFlow<MerchantUiState> = _uiState.asStateFlow()

    private var knownOrderIds: Set<String> = emptySet()

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
                merchant?.let {
                    loadOrders(it.id)
                    loadProducts()
                }
            }
        }
    }

    private fun loadOrders(merchantId: String) {
        viewModelScope.launch {
            repository.getOrdersForMerchant(merchantId).collect { orders ->
                val newPending = orders.firstOrNull { order ->
                    order.status == OrderStatus.PENDING &&
                    order.id !in knownOrderIds &&
                    knownOrderIds.isNotEmpty()
                }
                if (newPending != null) {
                    _uiState.update {
                        it.copy(
                            orders = orders,
                            filteredOrders = applyFilter(orders, it.currentFilter),
                            newOrderAlert = newPending
                        )
                    }
                } else {
                    _uiState.update {
                        it.copy(
                            orders = orders,
                            filteredOrders = applyFilter(orders, it.currentFilter)
                        )
                    }
                }
                knownOrderIds = orders.map { it.id }.toSet()
            }
        }
    }

    fun dismissNewOrderAlert() {
        _uiState.update { it.copy(newOrderAlert = null) }
    }

    fun refreshOrders() {
        val merchantId = _uiState.value.merchant?.id ?: return
        loadOrders(merchantId)
    }

    fun refreshProducts() {
        loadProducts()
    }

    fun loadProducts() {
        val merchantId = _uiState.value.merchant?.id ?: return
        viewModelScope.launch {
            repository.getProductsForMerchant(merchantId).collect { products ->
                _uiState.update {
                    it.copy(
                        products = products,
                        filteredProducts = applyProductFilter(products, it.productSearchQuery)
                    )
                }
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

    fun setProductSearchQuery(query: String) {
        _uiState.update {
            it.copy(
                productSearchQuery = query,
                filteredProducts = applyProductFilter(it.products, query)
            )
        }
    }

    fun setOrderSearchQuery(query: String) {
        _uiState.update {
            it.copy(
                orderSearchQuery = query,
                filteredOrders = applyOrderSearch(it.orders, it.currentFilter, query)
            )
        }
    }

    private fun applyOrderSearch(orders: List<Order>, filter: OrderFilter, query: String): List<Order> {
        val filtered = applyFilter(orders, filter)
        if (query.isBlank()) return filtered
        val q = query.trim().lowercase()
        return filtered.filter {
            it.customerName.lowercase().contains(q) ||
            it.id.lowercase().contains(q) ||
            it.customerPhone.lowercase().contains(q) ||
            it.deliveryAddress.lowercase().contains(q)
        }
    }

    private fun applyProductFilter(products: List<Product>, query: String): List<Product> {
        if (query.isBlank()) return products
        val q = query.trim().lowercase()
        return products.filter {
            it.name.lowercase().contains(q) ||
            it.category.lowercase().contains(q) ||
            it.description.lowercase().contains(q)
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

    fun signUp(
        email: String,
        password: String,
        name: String,
        phone: String,
        address: String,
        description: String,
        category: String,
        deliveryFee: Double,
        minOrderAmount: Double,
        deliveryTime: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.signUp(
                email = email,
                password = password,
                name = name,
                phone = phone,
                address = address,
                description = description,
                category = category,
                deliveryFee = deliveryFee,
                minOrderAmount = minOrderAmount,
                deliveryTime = deliveryTime
            )
                .onSuccess {
                    _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
                    loadMerchantData()
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Account creation failed")
                }
        }
    }

    fun signOut() {
        repository.signOut()
        _uiState.update { MerchantUiState(isAuthenticated = false, isLoading = false) }
    }

    fun resetPassword(
        email: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.resetPassword(email)
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false) }
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Failed to send reset email")
                }
        }
    }

    fun toggleStoreOpen(isOpen: Boolean) {
        val merchantId = _uiState.value.merchant?.id ?: return
        _uiState.update { it.copy(merchant = it.merchant?.copy(isOpen = isOpen)) }
        viewModelScope.launch {
            repository.updateStoreOpenStatus(merchantId, isOpen)
                .onFailure { error ->
                    _uiState.update {
                        it.copy(
                            error = error.message ?: "Failed to update store status",
                            merchant = it.merchant?.copy(isOpen = !isOpen)
                        )
                    }
                }
        }
    }

    fun updateMerchantProfile(
        name: String,
        phone: String,
        address: String,
        description: String,
        deliveryFee: Double,
        minOrderAmount: Double,
        deliveryTime: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val merchantId = _uiState.value.merchant?.id ?: run {
            onError("Merchant not loaded")
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.updateMerchantProfile(
                merchantId = merchantId,
                name = name,
                phone = phone,
                address = address,
                description = description,
                deliveryFee = deliveryFee,
                minOrderAmount = minOrderAmount,
                deliveryTime = deliveryTime
            )
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            merchant = it.merchant?.copy(
                                name = name,
                                phone = phone,
                                address = address,
                                description = description,
                                deliveryFee = deliveryFee,
                                minOrderAmount = minOrderAmount,
                                deliveryTime = deliveryTime
                            )
                        )
                    }
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Failed to update profile")
                }
        }
    }

    fun updateProduct(
        productId: String,
        name: String,
        description: String,
        price: Double,
        originalPrice: Double?,
        category: String,
        unit: String,
        stockQuantity: Int,
        featured: Boolean,
        imageUri: android.net.Uri?,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.updateProduct(
                productId = productId,
                name = name,
                description = description,
                price = price,
                originalPrice = originalPrice,
                category = category,
                unit = unit,
                stockQuantity = stockQuantity,
                featured = featured,
                imageUri = imageUri
            )
                .onSuccess {
                    _uiState.update { it.copy(isLoading = false) }
                    loadProducts()
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Failed to update product")
                }
        }
    }
}

data class MerchantUiState(
    val isAuthenticated: Boolean = false,
    val isLoading: Boolean = true,
    val merchant: Merchant? = null,
    val orders: List<Order> = emptyList(),
    val filteredOrders: List<Order> = emptyList(),
    val products: List<Product> = emptyList(),
    val filteredProducts: List<Product> = emptyList(),
    val productSearchQuery: String = "",
    val currentFilter: OrderFilter = OrderFilter.ALL,
    val orderSearchQuery: String = "",
    val newOrderAlert: Order? = null,
    val error: String? = null
)

enum class OrderFilter {
    ALL, PENDING, ACTIVE, COMPLETED
}
