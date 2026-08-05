package com.smartsoko.customer.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.customer.data.model.CartItem
import com.smartsoko.customer.data.model.Merchant
import com.smartsoko.customer.data.model.Order
import com.smartsoko.customer.data.model.Product
import com.smartsoko.customer.data.repository.Customer
import com.smartsoko.customer.data.repository.CustomerRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.util.Date

class CustomerViewModel : ViewModel() {
    private val repository = CustomerRepository()

    private val _uiState = MutableStateFlow(CustomerUiState())
    val uiState: StateFlow<CustomerUiState> = _uiState.asStateFlow()

    init {
        checkAuthState()
    }

    private fun checkAuthState() {
        val user = repository.currentUser
        if (user != null) {
            _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
            loadCustomerData()
        } else {
            _uiState.update { it.copy(isAuthenticated = false, isLoading = false) }
        }
    }

    fun clearError() {
        _uiState.update { it.copy(error = null) }
    }

    fun setSearchQuery(query: String) {
        _uiState.update { it.copy(searchQuery = query) }
    }

    fun refresh() {
        if (repository.currentUser != null) {
            loadCustomerData()
            loadRestaurants()
        }
    }

    private fun loadCustomerData() {
        viewModelScope.launch {
            try {
                repository.getCustomerForCurrentUser().collect { customer ->
                    _uiState.update { it.copy(customer = customer) }
                    customer?.let {
                        loadOrders(it.id)
                    }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "Failed to load customer data") }
            }
        }
    }

    fun loadRestaurants() {
        viewModelScope.launch {
            try {
                _uiState.update { it.copy(isLoading = true) }
                repository.getRestaurants().collect { restaurants ->
                    _uiState.update { it.copy(restaurants = restaurants, isLoading = false) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "Failed to load restaurants", isLoading = false) }
            }
        }
    }

    fun selectRestaurant(merchantId: String) {
        viewModelScope.launch {
            try {
                _uiState.update { it.copy(selectedRestaurant = null, products = emptyList(), isLoading = true) }
                val restaurant = _uiState.value.restaurants.firstOrNull { it.id == merchantId }
                _uiState.update { it.copy(selectedRestaurant = restaurant, isLoading = false) }
                repository.getProductsForRestaurant(merchantId).collect { products ->
                    _uiState.update { it.copy(products = products) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "Failed to load products", isLoading = false) }
            }
        }
    }

    fun loadProductsForRestaurant(merchantId: String) {
        selectRestaurant(merchantId)
    }

    fun addToCart(product: Product) {
        val current = _uiState.value.cart.toMutableList()
        val existing = current.firstOrNull { it.productId == product.id }
        if (existing != null) {
            val index = current.indexOf(existing)
            current[index] = existing.copy(quantity = existing.quantity + 1)
        } else {
            current.add(
                CartItem(
                    productId = product.id,
                    name = product.name,
                    price = product.price,
                    quantity = 1,
                    imageUrl = product.displayImageUrl,
                    merchantId = product.merchantId,
                    merchantName = _uiState.value.selectedRestaurant?.name ?: ""
                )
            )
        }
        _uiState.update { it.copy(cart = current) }
    }

    fun removeFromCart(productId: String) {
        val current = _uiState.value.cart.toMutableList()
        current.removeAll { it.productId == productId }
        _uiState.update { it.copy(cart = current) }
    }

    fun updateCartQuantity(productId: String, quantity: Int) {
        val current = _uiState.value.cart.toMutableList()
        val existing = current.firstOrNull { it.productId == productId } ?: return
        val index = current.indexOf(existing)
        if (quantity <= 0) {
            current.removeAt(index)
        } else {
            current[index] = existing.copy(quantity = quantity)
        }
        _uiState.update { it.copy(cart = current) }
    }

    fun clearCart() {
        _uiState.update { it.copy(cart = emptyList()) }
    }

    val cartTotal: Double
        get() = _uiState.value.cart.sumOf { it.lineTotal }

    val cartCount: Int
        get() = _uiState.value.cart.sumOf { it.quantity }

    fun loadOrders(customerId: String) {
        viewModelScope.launch {
            try {
                repository.getOrdersForCustomer(customerId).collect { orders ->
                    _uiState.update { it.copy(orders = orders) }
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message ?: "Failed to load orders") }
            }
        }
    }

    fun signIn(email: String, password: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.signIn(email, password)
                .onSuccess {
                    _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
                    loadCustomerData()
                    loadRestaurants()
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
                address = address
            )
                .onSuccess {
                    _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
                    loadCustomerData()
                    loadRestaurants()
                    onSuccess()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Account creation failed")
                }
        }
    }

    fun signInWithGoogle(idToken: String) {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.signInWithGoogle(idToken)
                .onSuccess {
                    _uiState.update { it.copy(isAuthenticated = true, isLoading = false) }
                    loadCustomerData()
                    loadRestaurants()
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false, error = error.message) }
                }
        }
    }

    fun signOut() {
        viewModelScope.launch {
            repository.signOut()
        }
        _uiState.update { CustomerUiState(isAuthenticated = false, isLoading = false) }
    }

    fun resetPassword(email: String, onSuccess: () -> Unit, onError: (String) -> Unit) {
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

    fun updateProfile(
        name: String,
        phone: String,
        address: String,
        onSuccess: () -> Unit,
        onError: (String) -> Unit
    ) {
        val customerId = _uiState.value.customer?.id ?: run {
            onError("Profile not loaded")
            return
        }
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.updateCustomerProfile(customerId, name, phone, address)
                .onSuccess {
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            customer = it.customer?.copy(name = name, phone = phone, address = address)
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

    fun placeOrder(
        deliveryAddress: String,
        paymentMethod: String,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val customer = _uiState.value.customer ?: run {
            onError("Customer not loaded")
            return
        }
        val cart = _uiState.value.cart
        if (cart.isEmpty()) {
            onError("Your cart is empty")
            return
        }

        val seller = cart.first()
        val items = cart.map { item ->
            hashMapOf(
                "productId" to item.productId,
                "name" to item.name,
                "quantity" to item.quantity,
                "price" to item.price,
                "imageUrl" to item.imageUrl
            )
        }
        val totalAmount = cart.sumOf { it.lineTotal }
        val deliveryFee = _uiState.value.selectedRestaurant?.deliveryFee ?: 0.0

        val orderMap = hashMapOf(
            "customerId" to customer.id,
            "customerName" to customer.name,
            "customerPhone" to customer.phone,
            "sellerId" to seller.merchantId,
            "sellerName" to seller.merchantName,
            "items" to items,
            "totalAmount" to totalAmount,
            "deliveryFee" to deliveryFee,
            "status" to "pending",
            "deliveryAddress" to deliveryAddress,
            "paymentMethod" to paymentMethod,
            "paymentStatus" to "pending",
            "createdAt" to Date(),
            "updatedAt" to Date()
        )

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true) }
            repository.placeOrder(orderMap)
                .onSuccess { orderId ->
                    _uiState.update { it.copy(isLoading = false, cart = emptyList()) }
                    customer.id.let { loadOrders(it) }
                    onSuccess(orderId)
                }
                .onFailure { error ->
                    _uiState.update { it.copy(isLoading = false) }
                    onError(error.message ?: "Failed to place order")
                }
        }
    }
}

data class CustomerUiState(
    val isAuthenticated: Boolean = false,
    val isLoading: Boolean = true,
    val customer: Customer? = null,
    val restaurants: List<Merchant> = emptyList(),
    val selectedRestaurant: Merchant? = null,
    val products: List<Product> = emptyList(),
    val cart: List<CartItem> = emptyList(),
    val orders: List<Order> = emptyList(),
    val searchQuery: String = "",
    val error: String? = null
)
