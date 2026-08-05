package com.smartsoko.admin.domain.repository

import com.smartsoko.admin.domain.model.*

interface AdminRepository {
    suspend fun login(email: String, password: String): Result<AdminUser>

    suspend fun getNotifications(): Result<List<Notification>>
    suspend fun createNotification(title: String, body: String, audience: String, priority: String, channel: String): Result<Notification>
    suspend fun broadcastNotification(title: String, body: String, audience: String, priority: String, channel: String): Result<Unit>

    suspend fun getRoles(): Result<List<Role>>
    suspend fun createRole(name: String, permissions: List<String>): Result<Role>
    suspend fun getAssignments(): Result<List<UserRole>>
    suspend fun assignRole(userId: String, roleName: String): Result<Unit>

    suspend fun getPayouts(): Result<List<Payout>>
    suspend fun processPayout(payoutId: String): Result<Unit>
    suspend fun getRefunds(): Result<List<Refund>>
    suspend fun approveRefund(refundId: String): Result<Unit>
    suspend fun getDisputes(): Result<List<Dispute>>
    suspend fun resolveDispute(disputeId: String, resolution: String): Result<Unit>

    suspend fun getWebhooks(): Result<List<Webhook>>
    suspend fun createWebhook(name: String, url: String, events: String): Result<Webhook>
    suspend fun deleteWebhook(webhookId: String): Result<Unit>

    suspend fun getApiKeys(): Result<List<ApiKey>>
    suspend fun generateApiKey(name: String, permissions: String): Result<ApiKey>
    suspend fun revokeApiKey(keyId: String): Result<Unit>

    suspend fun getAuditLogs(): Result<List<AuditLog>>
}
