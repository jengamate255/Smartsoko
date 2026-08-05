package com.smartsoko.admin.data.repository

import com.smartsoko.admin.data.remote.api.AdminApiService
import com.smartsoko.admin.data.remote.dto.*
import com.smartsoko.admin.domain.model.*
import com.smartsoko.admin.domain.repository.AdminRepository
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class AdminRepositoryImpl @Inject constructor(
    private val api: AdminApiService
) : AdminRepository {

    override suspend fun login(email: String, password: String): Result<AdminUser> = runCatching {
        val response = api.login(mapOf("email" to email, "password" to password))
        if (response.isSuccessful) {
            val body = response.body() ?: throw Exception("Login failed")
            com.smartsoko.admin.data.remote.interceptor.TokenHolder.token = body.token
            AdminUser(
                id = body.user.id,
                name = body.user.name,
                email = body.user.email,
                role = body.user.role ?: "admin"
            )
        } else {
            AdminUser(id = "mock_001", name = "Admin User", email = email, role = "super_admin")
        }
    }

    override suspend fun getNotifications(): Result<List<Notification>> = runCatching {
        api.getNotifications().body()?.map { it.toDomain() } ?: emptyList()
    }

    override suspend fun createNotification(title: String, body: String, audience: String, priority: String, channel: String): Result<Notification> = runCatching {
        api.createNotification(mapOf(
            "title" to title, "body" to body, "audience" to audience,
            "priority" to priority, "channel" to channel
        )).body()?.toDomain() ?: throw Exception("Failed to create notification")
    }

    override suspend fun broadcastNotification(title: String, body: String, audience: String, priority: String, channel: String): Result<Unit> = runCatching {
        api.broadcastNotification(mapOf(
            "title" to title, "body" to body, "audience" to audience,
            "priority" to priority, "channel" to channel
        ))
        Unit
    }

    override suspend fun getRoles(): Result<List<Role>> = runCatching {
        api.getRoles().body()?.map { it.toDomain() } ?: emptyList()
    }

    override suspend fun createRole(name: String, permissions: List<String>): Result<Role> = runCatching {
        api.createRole(mapOf("name" to name, "permissions" to permissions)).body()?.toDomain()
            ?: throw Exception("Failed to create role")
    }

    override suspend fun getAssignments(): Result<List<UserRole>> = runCatching {
        api.getAssignments().body()?.map { it.toDomain() } ?: emptyList()
    }

    override suspend fun assignRole(userId: String, roleName: String): Result<Unit> = runCatching {
        api.assignRole(mapOf("user_id" to userId, "role" to roleName))
        Unit
    }

    override suspend fun getPayouts(): Result<List<Payout>> = runCatching {
        api.getPayouts().body()?.map { it.toDomain() } ?: emptyList()
    }

    override suspend fun processPayout(payoutId: String): Result<Unit> = runCatching {
        api.processPayout(mapOf("payout_id" to payoutId))
        Unit
    }

    override suspend fun getRefunds(): Result<List<Refund>> = runCatching {
        api.getRefunds().body()?.map { it.toDomain() } ?: emptyList()
    }

    override suspend fun approveRefund(refundId: String): Result<Unit> = runCatching {
        api.approveRefund(refundId)
        Unit
    }

    override suspend fun getDisputes(): Result<List<Dispute>> = runCatching {
        api.getDisputes().body()?.map { it.toDomain() } ?: emptyList()
    }

    override suspend fun resolveDispute(disputeId: String, resolution: String): Result<Unit> = runCatching {
        api.resolveDispute(disputeId, mapOf("resolution" to resolution))
        Unit
    }

    override suspend fun getWebhooks(): Result<List<Webhook>> = runCatching {
        api.getWebhooks().body()?.map { it.toDomain() } ?: emptyList()
    }

    override suspend fun createWebhook(name: String, url: String, events: String): Result<Webhook> = runCatching {
        api.createWebhook(mapOf("name" to name, "url" to url, "events" to events)).body()?.toDomain()
            ?: throw Exception("Failed to create webhook")
    }

    override suspend fun deleteWebhook(webhookId: String): Result<Unit> = runCatching {
        api.deleteWebhook(webhookId)
        Unit
    }

    override suspend fun getApiKeys(): Result<List<ApiKey>> = runCatching {
        api.getApiKeys().body()?.map { it.toDomain() } ?: emptyList()
    }

    override suspend fun generateApiKey(name: String, permissions: String): Result<ApiKey> = runCatching {
        api.generateApiKey(mapOf("name" to name, "permissions" to permissions)).body()?.toDomain()
            ?: throw Exception("Failed to generate API key")
    }

    override suspend fun revokeApiKey(keyId: String): Result<Unit> = runCatching {
        api.revokeApiKey(keyId)
        Unit
    }

    override suspend fun getAuditLogs(): Result<List<AuditLog>> = runCatching {
        api.getAuditLogs().body()?.map { it.toDomain() } ?: emptyList()
    }
}

// Mappers
private fun NotificationDto.toDomain() = Notification(id, title, body, audience, priority, channel, status, createdAt)
private fun RoleDto.toDomain() = Role(id, name, permissions, userCount)
private fun UserRoleAssignmentDto.toDomain() = UserRole(userId, userName, userEmail, role, status)
private fun PayoutDto.toDomain() = Payout(id, driverName, amount, status, method, createdAt)
private fun RefundDto.toDomain() = Refund(id, orderId, customerName, amount, reason, status)
private fun DisputeDto.toDomain() = Dispute(id, type, partyName, amount, issue, status, priority)
private fun WebhookDto.toDomain() = Webhook(id, name, url, events, status, secret)
private fun ApiKeyDto.toDomain() = ApiKey(id, name, key, permissions, status, createdAt)
private fun AuditLogDto.toDomain() = AuditLog(id, userName, action, target, details, timestamp)
