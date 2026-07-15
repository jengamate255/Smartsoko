package com.smartsoko.driver.ui.screen.history

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.driver.domain.model.Order
import com.smartsoko.driver.domain.usecase.GetOrderHistoryUseCase
import com.smartsoko.driver.ui.state.DriverState
import com.smartsoko.driver.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class HistoryUiState(
    val orders: List<Order> = emptyList(),
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class HistoryViewModel @Inject constructor(
    private val getOrderHistoryUseCase: GetOrderHistoryUseCase,
    private val driverState: DriverState
) : ViewModel() {

    private val _state = MutableStateFlow(HistoryUiState())
    val state = _state.asStateFlow()

    init { loadHistory() }

    fun loadHistory() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            when (val result = getOrderHistoryUseCase(driverState.state.value.authToken)) {
                is Resource.Success -> _state.value = HistoryUiState(orders = result.data)
                is Resource.Error -> _state.value = HistoryUiState(error = result.message)
                is Resource.Loading -> {}
            }
        }
    }
}
