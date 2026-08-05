package com.smartsoko.admin.ui.screens.support

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.admin.data.remote.dto.SlaMetrics
import com.smartsoko.admin.data.remote.dto.TicketDto
import com.smartsoko.admin.domain.repository.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class SupportUiState(
    val isLoading: Boolean = true,
    val tickets: List<TicketDto> = emptyList(),
    val slaMetrics: SlaMetrics? = null,
    val statusFilter: String = "all",
    val error: String? = null
)

@HiltViewModel
class SupportViewModel @Inject constructor(
    private val repository: AdminRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(SupportUiState())
    val uiState: StateFlow<SupportUiState> = _uiState.asStateFlow()

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val ticketsResult = repository.getTickets()
            val slaResult = repository.getSlaMetrics()
            _uiState.value = _uiState.value.copy(
                isLoading = false,
                tickets = ticketsResult.getOrNull() ?: emptyList(),
                slaMetrics = slaResult.getOrNull()
            )
        }
    }

    fun setStatusFilter(status: String) {
        _uiState.value = _uiState.value.copy(statusFilter = status)
    }

    fun respondToTicket(id: String, response: String) {
        viewModelScope.launch { repository.respondToTicket(id, response); loadData() }
    }

    fun assignTicket(id: String, assignee: String) {
        viewModelScope.launch { repository.assignTicket(id, assignee); loadData() }
    }
}
