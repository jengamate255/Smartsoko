package com.smartsoko.customer.presentation.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.customer.domain.model.Order
import com.smartsoko.customer.domain.model.OrderStatus
import com.smartsoko.customer.domain.repository.OrderRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OrdersUiState(
    val isLoading: Boolean = true,
    val activeOrders: List<Order> = emptyList(),
    val pastOrders: List<Order> = emptyList(),
    val selectedTab: Int = 0,
    val error: String? = null,
    val navigateToTracking: String? = null,
    val refreshing: Boolean = false
)

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val orderRepository: OrderRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    init {
        loadOrders()
    }

    private fun loadOrders() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, error = null) }
            try {
                val activeStatuses = setOf(
                    OrderStatus.PENDING, OrderStatus.ACCEPTED,
                    OrderStatus.PREPARING, OrderStatus.READY_FOR_PICKUP,
                    OrderStatus.ON_THE_WAY
                )
                val pastStatuses = setOf(
                    OrderStatus.DELIVERED, OrderStatus.CANCELLED,
                    OrderStatus.REFUNDED
                )

                val allActive = mutableListOf<Order>()
                val allPast = mutableListOf<Order>()

                for (status in activeStatuses) {
                    orderRepository.getOrdersByStatus(status).first().let { orders ->
                        allActive.addAll(orders)
                    }
                }
                for (status in pastStatuses) {
                    orderRepository.getOrdersByStatus(status).first().let { orders ->
                        allPast.addAll(orders)
                    }
                }

                _uiState.update {
                    it.copy(
                        isLoading = false,
                        activeOrders = allActive.distinctBy { o -> o.id }
                            .sortedByDescending { o -> o.createdAt },
                        pastOrders = allPast.distinctBy { o -> o.id }
                            .sortedByDescending { o -> o.createdAt }
                    )
                }
            } catch (e: Exception) {
                _uiState.update { it.copy(isLoading = false, error = e.message) }
            }
        }
    }

    fun selectTab(index: Int) {
        _uiState.update { it.copy(selectedTab = index) }
    }

    fun refresh() {
        viewModelScope.launch {
            _uiState.update { it.copy(refreshing = true) }
            try {
                orderRepository.refreshOrders()
                loadOrders()
            } catch (e: Exception) {
                _uiState.update { it.copy(error = e.message) }
            }
            _uiState.update { it.copy(refreshing = false) }
        }
    }

    fun onTrackOrder(orderId: String) {
        _uiState.update { it.copy(navigateToTracking = orderId) }
    }

    fun clearNavigation() {
        _uiState.update { it.copy(navigateToTracking = null) }
    }
}
