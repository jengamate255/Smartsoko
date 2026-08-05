package com.smartsoko.admin.ui.screens.users

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

data class UserDetailUiState(
    val isLoading: Boolean = true,
    val error: String? = null,
    val name: String = "",
    val email: String = "",
    val phone: String = "",
    val role: String = "customer",
    val isSuspended: Boolean? = null,
    val activities: List<OrderEventDto> = emptyList(),
    val orders: List<OrderDto> = emptyList()
)

@HiltViewModel
class UserDetailViewModel @Inject constructor(
    private val repository: AdminRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(UserDetailUiState())
    val uiState: StateFlow<UserDetailUiState> = _uiState.asStateFlow()

    private var userId: String = ""

    fun loadUser(id: String) {
        userId = id
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val userResult = repository.getUser(id)
            val activityResult = repository.getUserActivity(id)
            val ordersResult = repository.getUserOrders(id)

            userResult.fold(
                onSuccess = { user ->
                    _uiState.value = _uiState.value.copy(
                        isLoading = false,
                        name = user.name ?: user.fullName ?: "Unknown",
                        email = user.email ?: "",
                        phone = user.phone ?: "",
                        role = user.role ?: "customer",
                        isSuspended = user.status == "suspended",
                        activities = activityResult.getOrNull() ?: emptyList(),
                        orders = ordersResult.getOrNull() ?: emptyList()
                    )
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
                }
            )
        }
    }

    fun suspendUser() {
        viewModelScope.launch {
            repository.suspendUser(userId)
            loadUser(userId)
        }
    }

    fun activateUser() {
        viewModelScope.launch {
            repository.activateUser(userId)
            loadUser(userId)
        }
    }

    fun deleteUser() {
        viewModelScope.launch {
            repository.deleteUser(userId)
        }
    }
}