package com.smartsoko.admin.ui.screens.users

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.admin.data.remote.dto.UserDto
import com.smartsoko.admin.domain.repository.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class UsersUiState(
    val isLoading: Boolean = true,
    val users: List<UserDto> = emptyList(),
    val searchQuery: String = "",
    val roleFilter: String = "all",
    val error: String? = null
)

@HiltViewModel
class UsersViewModel @Inject constructor(
    private val repository: AdminRepository
) : ViewModel() {

    private val _uiState = MutableStateFlow(UsersUiState())
    val uiState: StateFlow<UsersUiState> = _uiState.asStateFlow()

    private var allUsers: List<UserDto> = emptyList()

    fun loadUsers() {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true)
            val result = repository.getUsers()
            result.fold(
                onSuccess = { users ->
                    allUsers = users
                    applyFilters()
                },
                onFailure = { e ->
                    _uiState.value = _uiState.value.copy(isLoading = false, error = e.message)
                }
            )
        }
    }

    fun setSearchQuery(query: String) {
        _uiState.value = _uiState.value.copy(searchQuery = query)
        applyFilters()
    }

    fun setRoleFilter(role: String) {
        _uiState.value = _uiState.value.copy(roleFilter = role)
        applyFilters()
    }

    fun suspendUser(id: String) {
        viewModelScope.launch {
            repository.suspendUser(id)
            loadUsers()
        }
    }

    fun activateUser(id: String) {
        viewModelScope.launch {
            repository.activateUser(id)
            loadUsers()
        }
    }

    fun deleteUser(id: String) {
        viewModelScope.launch {
            repository.deleteUser(id)
            loadUsers()
        }
    }

    private fun applyFilters() {
        val state = _uiState.value
        var filtered = allUsers
        if (state.roleFilter != "all") filtered = filtered.filter { it.role == state.roleFilter }
        if (state.searchQuery.isNotBlank()) {
            val q = state.searchQuery.lowercase()
            filtered = filtered.filter {
                (it.name ?: it.fullName ?: "").lowercase().contains(q) ||
                (it.email ?: "").lowercase().contains(q) ||
                (it.phone ?: "").contains(q)
            }
        }
        _uiState.value = _uiState.value.copy(isLoading = false, users = filtered)
    }
}