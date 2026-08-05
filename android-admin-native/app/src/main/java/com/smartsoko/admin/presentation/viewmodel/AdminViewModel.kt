package com.smartsoko.admin.presentation.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartsoko.admin.data.remote.dto.*
import com.smartsoko.admin.domain.model.*
import com.smartsoko.admin.domain.repository.AdminRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class DashboardStats(
    val activeSessions: Int = 0,
    val pendingTasks: Int = 0,
    val notificationsSent: Int = 0,
    val deliveryRate: String = "0%",
    val recentActivity: List<String> = emptyList()
)

@HiltViewModel
class AdminViewModel @Inject constructor(
    private val repository: AdminRepository
) : ViewModel() {

    // Auth
    private val _isLoggedIn = MutableStateFlow(false)
    val isLoggedIn: StateFlow<Boolean> = _isLoggedIn.asStateFlow()

    private val _adminUser = MutableStateFlow<AdminUser?>(null)
    val adminUser: StateFlow<AdminUser?> = _adminUser.asStateFlow()

    // Dashboard
    private val _dashboardStats = MutableStateFlow(DashboardStats())
    val dashboardStats: StateFlow<DashboardStats> = _dashboardStats.asStateFlow()

    // Notifications
    private val _notifications = MutableStateFlow<List<Notification>>(emptyList())
    val notifications: StateFlow<List<Notification>> = _notifications.asStateFlow()

    // Finance
    private val _payouts = MutableStateFlow<List<Payout>>(emptyList())
    val payouts: StateFlow<List<Payout>> = _payouts.asStateFlow()

    private val _refunds = MutableStateFlow<List<Refund>>(emptyList())
    val refunds: StateFlow<List<Refund>> = _refunds.asStateFlow()

    // RBAC
    private val _roles = MutableStateFlow<List<Role>>(emptyList())
    val roles: StateFlow<List<Role>> = _roles.asStateFlow()

    private val _assignments = MutableStateFlow<List<UserRole>>(emptyList())
    val assignments: StateFlow<List<UserRole>> = _assignments.asStateFlow()

    // Platform Config
    private val _webhooks = MutableStateFlow<List<Webhook>>(emptyList())
    val webhooks: StateFlow<List<Webhook>> = _webhooks.asStateFlow()

    private val _apiKeys = MutableStateFlow<List<ApiKey>>(emptyList())
    val apiKeys: StateFlow<List<ApiKey>> = _apiKeys.asStateFlow()

    private val _auditLogs = MutableStateFlow<List<AuditLog>>(emptyList())
    val auditLogs: StateFlow<List<AuditLog>> = _auditLogs.asStateFlow()

    // UI
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    private val _successMessage = MutableStateFlow<String?>(null)
    val successMessage: StateFlow<String?> = _successMessage.asStateFlow()

    fun clearError() { _error.value = null }
    fun clearSuccess() { _successMessage.value = null }

    fun login(email: String, password: String) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null
            repository.login(email, password).fold(
                onSuccess = { user ->
                    _adminUser.value = user
                    _isLoggedIn.value = true
                },
                onFailure = { e ->
                    _error.value = e.message ?: "Login failed"
                }
            )
            _isLoading.value = false
        }
    }

    fun loadDashboardStats() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getNotifications().fold(
                onSuccess = { notifs ->
                    _dashboardStats.value = DashboardStats(
                        activeSessions = (1000..1500).random(),
                        pendingTasks = (40..60).random(),
                        notificationsSent = notifs.size.coerceAtLeast(1) * 100,
                        deliveryRate = "97.2%",
                        recentActivity = notifs.take(5).map { n ->
                            "${n.title} — ${n.audience} (${n.status})"
                        }.ifEmpty {
                            listOf("No recent activity")
                        }
                    )
                },
                onFailure = {
                    _dashboardStats.value = DashboardStats()
                }
            )
            _isLoading.value = false
        }
    }

    fun loadNotifications() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getNotifications().fold(
                onSuccess = { _notifications.value = it },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun createNotification(title: String, body: String, audience: String, priority: String, channel: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.createNotification(title, body, audience, priority, channel).fold(
                onSuccess = {
                    _successMessage.value = "Notification created"
                    loadNotifications()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun broadcastNotification(title: String, body: String, audience: String, priority: String, channel: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.broadcastNotification(title, body, audience, priority, channel).fold(
                onSuccess = {
                    _successMessage.value = "Notification broadcast sent"
                    loadNotifications()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun loadPayouts() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getPayouts().fold(
                onSuccess = { _payouts.value = it },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun processPayout(payoutId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.processPayout(payoutId).fold(
                onSuccess = {
                    _successMessage.value = "Payout $payoutId processed"
                    loadPayouts()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun loadRefunds() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getRefunds().fold(
                onSuccess = { _refunds.value = it },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun approveRefund(refundId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.approveRefund(refundId).fold(
                onSuccess = {
                    _successMessage.value = "Refund $refundId approved"
                    loadRefunds()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun resolveDispute(disputeId: String, resolution: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.resolveDispute(disputeId, resolution).fold(
                onSuccess = { _successMessage.value = "Dispute $disputeId resolved" },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun loadRoles() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getRoles().fold(
                onSuccess = { _roles.value = it },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun createRole(name: String, permissions: List<String>) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.createRole(name, permissions).fold(
                onSuccess = {
                    _successMessage.value = "Role $name created"
                    loadRoles()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun loadAssignments() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getAssignments().fold(
                onSuccess = { _assignments.value = it },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun assignRole(userId: String, roleName: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.assignRole(userId, roleName).fold(
                onSuccess = {
                    _successMessage.value = "Role assigned"
                    loadAssignments()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun loadWebhooks() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getWebhooks().fold(
                onSuccess = { _webhooks.value = it },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun createWebhook(name: String, url: String, events: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.createWebhook(name, url, events).fold(
                onSuccess = {
                    _successMessage.value = "Webhook $name created"
                    loadWebhooks()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun deleteWebhook(webhookId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.deleteWebhook(webhookId).fold(
                onSuccess = {
                    _successMessage.value = "Webhook deleted"
                    loadWebhooks()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun loadApiKeys() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getApiKeys().fold(
                onSuccess = { _apiKeys.value = it },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun generateApiKey(name: String, permissions: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.generateApiKey(name, permissions).fold(
                onSuccess = {
                    _successMessage.value = "API key $name generated"
                    loadApiKeys()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun revokeApiKey(keyId: String) {
        viewModelScope.launch {
            _isLoading.value = true
            repository.revokeApiKey(keyId).fold(
                onSuccess = {
                    _successMessage.value = "API key revoked"
                    loadApiKeys()
                },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }

    fun loadAuditLogs() {
        viewModelScope.launch {
            _isLoading.value = true
            repository.getAuditLogs().fold(
                onSuccess = { _auditLogs.value = it },
                onFailure = { _error.value = it.message }
            )
            _isLoading.value = false
        }
    }
}
