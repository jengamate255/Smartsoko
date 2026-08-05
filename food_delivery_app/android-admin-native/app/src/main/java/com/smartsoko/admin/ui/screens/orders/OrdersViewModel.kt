package com.smartsoko.admin.ui.screens.orders

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.admin.data.remote.dto.OrderDto
import com.smartsoko.admin.data.remote.dto.OrderEventDto
import com.smartsoko.admin.domain.repository.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OrdersUiState(
    val isLoading: Boolean = true,
    val orders: List<OrderDto> = emptyList(),
    val statusFilter: String = "all",
    val error: String? = null
)

data class OrderDetailUiState(
    val isLoading: Boolean = true,
    val order: OrderDto? = null,
    val timeline: List<OrderEventDto> = emptyList(),
    val error: String? = null
)

@HiltViewModel
class OrdersViewModel @Inject constructor(
    private val repository: AdminRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrdersUiState())
    val uiState: StateFlow<OrdersUiState> = _uiState.asStateFlow()

    private val _detailState = MutableStateFlow(OrderDetailUiState())
    val detailState: StateFlow<OrderDetailUiState> = _detailState.asStateFlow()

    fun loadOrders() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val result = repository.getOrders()
            result.fold(
                onSuccess = { orders ->
                    val filtered = if (_uiState.value.statusFilter == "all") orders
                    else orders.filter { it.status == _uiState.value.statusFilter }
                    _uiState.value = _uiState.value.copy(isLoading = false, orders = filtered)
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
                }
            )
        }
    }

    fun setStatusFilter(status: String) {
        _uiState.value = _uiState.value.copy(statusFilter = status)
        loadOrders()
    }

    fun loadOrderDetail(id: String) {
        viewModelScope.launch {
            _detailState.value = OrderDetailUiState()
            val orderResult = repository.getOrder(id)
            val timelineResult = repository.getOrderTimeline(id)
            orderResult.fold(
                onSuccess = { order ->
                    _detailState.value = OrderDetailUiState(
                        isLoading = false,
                        order = order,
                        timeline = timelineResult.getOrNull() ?: emptyList()
                    )
                },
                onFailure = { e ->
                    _detailState.value = OrderDetailUiState(isLoading = false, error = e.message)
                }
            )
        }
    }

    fun addNote(orderId: String, note: String) {
        viewModelScope.launch { repository.addOrderNote(orderId, note); loadOrderDetail(orderId) }
    }

    fun processRefund(orderId: String, amount: Double, reason: String) {
        viewModelScope.launch { repository.processRefund(orderId, amount, reason); loadOrderDetail(orderId) }
    }
}
