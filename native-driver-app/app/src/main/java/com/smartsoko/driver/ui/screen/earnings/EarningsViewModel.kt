package com.smartsoko.driver.ui.screen.earnings

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.driver.data.remote.ApiService
import com.smartsoko.driver.data.remote.EarningsDto
import com.smartsoko.driver.domain.model.DailyEarning
import com.smartsoko.driver.domain.model.Earnings
import com.smartsoko.driver.domain.usecase.GetEarningsUseCase
import com.smartsoko.driver.ui.state.DriverState
import com.smartsoko.driver.util.Resource
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class EarningsUiState(
    val earnings: Earnings? = null,
    val isLoading: Boolean = false,
    val error: String? = null
)

@HiltViewModel
class EarningsViewModel @Inject constructor(
    private val getEarningsUseCase: GetEarningsUseCase,
    private val driverState: DriverState
) : ViewModel() {

    private val _state = MutableStateFlow(EarningsUiState())
    val state = _state.asStateFlow()

    init { loadEarnings() }

    fun loadEarnings() {
        viewModelScope.launch {
            _state.value = _state.value.copy(isLoading = true)
            when (val result = getEarningsUseCase(driverState.state.value.authToken)) {
                is Resource.Success -> _state.value = EarningsUiState(earnings = result.data)
                is Resource.Error -> _state.value = EarningsUiState(error = result.message)
                is Resource.Loading -> {}
            }
        }
    }
}
